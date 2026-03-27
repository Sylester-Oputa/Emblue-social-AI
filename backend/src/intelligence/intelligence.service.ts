import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { PrismaService } from "../database/prisma.service";
import { AgentRunService } from "../audit/agent-run.service";

export interface GeneratedReply {
  content: string;
  ctaText: string;
  confidence: number;
  strategy: string;
  riskFlag?: boolean;
  riskReasons?: string[];
  tone?: string;
}

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);
  private openai: OpenAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly agentRunService: AgentRunService,
  ) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    if (apiKey) {
      // Validate API key format at startup
      if (!apiKey.startsWith("sk-") || apiKey.length < 20) {
        throw new Error(
          "Invalid OPENAI_API_KEY format. Expected a valid OpenAI API key starting with 'sk-'. " +
            "Set a valid key or remove the environment variable to use template fallback.",
        );
      }
      this.openai = new OpenAI({ apiKey });
      this.logger.log(
        "OpenAI client initialized — using GPT-4 for reply generation",
      );
    } else {
      this.logger.warn(
        "OPENAI_API_KEY not set — falling back to template-based generation",
      );
    }
  }

  /**
   * Generate 3 contextual reply variants for a signal.
   * Uses OpenAI GPT-4 when API key is available, otherwise template fallback.
   */
  async generateResponses(
    signalId: string,
    workspaceId: string,
  ): Promise<GeneratedReply[]> {
    const signal = await this.prisma.normalizedSignal.findUnique({
      where: { id: signalId },
      include: { sentimentResult: true, intentResult: true },
    });

    if (!signal) {
      throw new Error(`Signal ${signalId} not found`);
    }

    const brandProfile = await this.prisma.brandProfile.findFirst({
      where: { workspaceId },
    });

    const intent = signal.intentResult?.label || "INQUIRY";
    const sentiment = signal.sentimentResult?.label || "NEUTRAL";
    const tone = brandProfile?.tone || "professional";
    const prohibited = brandProfile?.prohibitedTerms || [];
    const authorHandle = signal.authorHandle || "there";

    // Try OpenAI first, fall back to templates
    if (this.openai) {
      try {
        return await this.generateWithOpenAI(
          signal,
          brandProfile,
          intent,
          sentiment,
          tone,
          prohibited,
          authorHandle,
          workspaceId,
        );
      } catch (err: any) {
        this.logger.error(
          `OpenAI generation failed, falling back to templates: ${err.message}`,
        );
      }
    }

    return this.generateWithTemplates(
      intent,
      sentiment,
      tone,
      prohibited,
      authorHandle,
      signalId,
    );
  }

  private async generateWithOpenAI(
    signal: any,
    brandProfile: any,
    intent: string,
    sentiment: string,
    tone: string,
    prohibited: string[],
    authorHandle: string,
    workspaceId: string,
  ): Promise<GeneratedReply[]> {
    const startTime = Date.now();

    const systemPrompt = `You are Agent_Reply_Assistant. Generate three on-brand reply suggestions.
Suggestions must comply with the supplied ruleset:
- Do not include phrases listed in "do_not_say"
- Include all "required_phrases"
- Append any "required_disclaimers" at the end of each suggestion
- Never ask for OTP, PIN, password, bank details or other sensitive information
- If risk content (harassment, self-harm, fraud, legal threats) is detected, set risk_flag to true with appropriate risk_reasons
- When risk is detected, variant 3 must be an escalation-safe reply: "We can't assist with that here. Please contact support via official channels."
- Avoid harassment, hate speech or self-harm language. Use neutral escalation language when necessary.

Return ONLY valid JSON matching this exact structure:
{
  "suggestions": [
    { "variant_no": 1, "text": "string", "tone": "string", "risk_flag": false, "risk_reasons": [] },
    { "variant_no": 2, "text": "string", "tone": "string", "risk_flag": false, "risk_reasons": [] },
    { "variant_no": 3, "text": "string", "tone": "string", "risk_flag": false, "risk_reasons": [] }
  ]
}`;

    const userPrompt = JSON.stringify({
      brand_name: brandProfile?.companyName || "Our Brand",
      platform: signal.platform,
      message_text: signal.body || signal.rawBody || "",
      thread_context_text: null,
      author_handle: authorHandle,
      intent,
      sentiment,
      ruleset: {
        tone,
        do_not_say: prohibited,
        required_phrases: brandProfile?.requiredPhrases || [],
        required_disclaimers: brandProfile?.requiredDisclaimers || [],
      },
    });

    const completion = await this.openai!.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    });

    const latencyMs = Date.now() - startTime;
    const raw = completion.choices[0]?.message?.content || "{}";
    const tokenCount = completion.usage?.total_tokens || 0;

    // Log the agent run
    await this.agentRunService
      .logRun({
        workspaceId,
        agentName: "Agent_Reply_Assistant",
        inputJson: { signalId: signal.id, intent, sentiment, tone },
        outputJson: JSON.parse(raw),
        status: "SUCCESS",
        modelName: "gpt-4",
        tokenCount,
        latencyMs,
      })
      .catch((e) => this.logger.error(`Failed to log agent run: ${e.message}`));

    const parsed = JSON.parse(raw);
    const suggestions = parsed.suggestions || [];

    return suggestions.map((s: any, i: number) => ({
      content: s.text,
      ctaText:
        i === 0 ? "Reply Now" : i === 1 ? "Learn More" : "Contact Support",
      confidence: s.risk_flag ? 0.6 : 0.9 - i * 0.05,
      strategy: `openai_variant_${s.variant_no}`,
      riskFlag: s.risk_flag || false,
      riskReasons: s.risk_reasons || [],
      tone: s.tone,
    }));
  }

  private generateWithTemplates(
    intent: string,
    sentiment: string,
    tone: string,
    prohibited: string[],
    authorHandle: string,
    signalId: string,
  ): GeneratedReply[] {
    const templates = this.getTemplates(intent, sentiment, tone, authorHandle);

    const filtered = templates.filter((t) => {
      const lower = t.content.toLowerCase();
      return !prohibited.some((p) => lower.includes(p.toLowerCase()));
    });

    while (filtered.length < 3) {
      filtered.push({
        content: this.genericReply(tone, authorHandle),
        ctaText: "Learn More",
        confidence: 0.5,
        strategy: "generic_fallback",
      });
    }

    this.logger.log(
      `Generated ${filtered.length} template replies for signal ${signalId} (intent=${intent}, sentiment=${sentiment}, tone=${tone})`,
    );

    return filtered.slice(0, 3);
  }

  private getTemplates(
    intent: string,
    sentiment: string,
    tone: string,
    author: string,
  ): GeneratedReply[] {
    const toneMap: Record<
      string,
      { greeting: string; closing: string; style: string }
    > = {
      professional: { greeting: "Hello", closing: "Best regards", style: "We" },
      friendly: { greeting: "Hey", closing: "Cheers", style: "we" },
      casual: { greeting: "Hi", closing: "Thanks!", style: "we" },
      formal: {
        greeting: "Dear valued customer",
        closing: "Sincerely",
        style: "Our team",
      },
      empathetic: {
        greeting: "Hi",
        closing: "We're here for you",
        style: "We",
      },
    };

    const t = toneMap[tone] || toneMap.professional;

    const intentTemplates: Record<string, GeneratedReply[]> = {
      COMPLAINT: [
        {
          content: `${t.greeting} @${author}, we sincerely apologize for the inconvenience. ${t.style} take this seriously and want to make it right. Could you share more details so we can resolve this promptly? ${t.closing}.`,
          ctaText: "Contact Support",
          confidence: 0.92,
          strategy: "empathy_first",
        },
        {
          content: `@${author} Thank you for bringing this to our attention. ${t.style} understand how frustrating this must be. Our team is looking into this and we'll follow up within 24 hours. ${t.closing}.`,
          ctaText: "Track Status",
          confidence: 0.88,
          strategy: "acknowledge_and_timeline",
        },
        {
          content: `${t.greeting} @${author}, we're sorry to hear about your experience. This isn't the standard we hold ourselves to. Please DM us your details and ${t.style.toLowerCase()}'ll prioritize your case. ${t.closing}.`,
          ctaText: "Send DM",
          confidence: 0.85,
          strategy: "escalate_to_dm",
        },
      ],
      QUESTION: [
        {
          content: `${t.greeting} @${author}! Great question. ${t.style} would be happy to help you with that. Could you let us know a bit more about what you're looking for? ${t.closing}.`,
          ctaText: "Learn More",
          confidence: 0.9,
          strategy: "clarify_and_help",
        },
        {
          content: `@${author} Thanks for reaching out! You can find detailed information about this on our help center. If you need further assistance, ${t.style.toLowerCase()}'re here to help. ${t.closing}.`,
          ctaText: "Visit Help Center",
          confidence: 0.87,
          strategy: "direct_to_resource",
        },
        {
          content: `${t.greeting} @${author}, that's a great question! Let us look into the specifics for you. ${t.style}'ll get back to you with a detailed answer shortly. ${t.closing}.`,
          ctaText: "Get Details",
          confidence: 0.83,
          strategy: "promise_followup",
        },
      ],
      PRAISE: [
        {
          content: `@${author} Thank you so much for the kind words! 🙏 ${t.style} really appreciate your support and it means the world to our team. ${t.closing}.`,
          ctaText: "Share More",
          confidence: 0.95,
          strategy: "gratitude",
        },
        {
          content: `${t.greeting} @${author}! We're thrilled to hear this! Feedback like yours keeps us motivated to do even better. Thank you for being part of our community! ${t.closing}.`,
          ctaText: "Join Community",
          confidence: 0.91,
          strategy: "community_engagement",
        },
        {
          content: `@${author} Wow, thank you! 😊 ${t.style}'re so glad you had a positive experience. Don't hesitate to reach out if you ever need anything! ${t.closing}.`,
          ctaText: "Stay Connected",
          confidence: 0.89,
          strategy: "reinforce_relationship",
        },
      ],
      FEEDBACK: [
        {
          content: `${t.greeting} @${author}, thank you for sharing your feedback! ${t.style} value input from our community and will share this with our product team. ${t.closing}.`,
          ctaText: "Submit Feedback",
          confidence: 0.88,
          strategy: "acknowledge_feedback",
        },
        {
          content: `@${author} We appreciate you taking the time to share this. ${t.style}'re always looking to improve and your perspective helps us do that. ${t.closing}.`,
          ctaText: "Learn More",
          confidence: 0.85,
          strategy: "validate_and_improve",
        },
        {
          content: `${t.greeting} @${author}! This is really valuable feedback. ${t.style}'ve noted this and will consider it for future updates. Thanks for helping us improve! ${t.closing}.`,
          ctaText: "See Updates",
          confidence: 0.82,
          strategy: "commit_to_action",
        },
      ],
      SPAM: [
        {
          content: `Thank you for your message, @${author}. If you have a genuine question or concern, please don't hesitate to reach out to our support team.`,
          ctaText: "Contact Support",
          confidence: 0.6,
          strategy: "polite_deflection",
        },
        {
          content: `@${author} We appreciate you reaching out. For assistance with our products or services, please visit our official channels.`,
          ctaText: "Official Site",
          confidence: 0.55,
          strategy: "redirect_official",
        },
        {
          content: `Hi @${author}, thanks for your message. If this is regarding our services, our support team is available to assist you directly.`,
          ctaText: "Get Help",
          confidence: 0.5,
          strategy: "offer_genuine_help",
        },
      ],
    };

    // Default to INQUIRY templates
    const base = intentTemplates[intent] || intentTemplates.QUESTION;

    // If sentiment is negative but intent isn't complaint, boost empathy
    if (sentiment === "NEGATIVE" && intent !== "COMPLAINT") {
      return [
        {
          content: `${t.greeting} @${author}, we noticed your concern and want to help. ${t.style} take all feedback seriously. Can you tell us more so we can assist? ${t.closing}.`,
          ctaText: "Get Help",
          confidence: 0.89,
          strategy: "proactive_empathy",
        },
        ...base.slice(0, 2),
      ];
    }

    return base;
  }

  private genericReply(tone: string, author: string): string {
    const greetings: Record<string, string> = {
      professional: "Hello",
      friendly: "Hey",
      casual: "Hi",
      formal: "Dear valued customer",
      empathetic: "Hi",
    };
    const g = greetings[tone] || "Hello";
    return `${g} @${author}, thank you for reaching out! We've received your message and our team will follow up shortly. We appreciate your patience.`;
  }
}
