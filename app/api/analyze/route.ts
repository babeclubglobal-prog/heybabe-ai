import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const idea = body.idea;
    const mode = body.mode || "analyze";

    if (!idea) {
      return Response.json(
        { error: "No business idea provided" },
        { status: 400 }
      );
    }

    const prompts: Record<string, string> = {
      analyze: `
You are Heybabe AI, an AI business co-founder for beginner online founders.

Return your answer EXACTLY in Markdown format.
Every main section title MUST start with "#".
Every subsection title MUST start with "##".
Use bullet points, numbered lists, and bold text.

Analyze this business idea:

${idea}

Use this exact structure:

# Business Summary

# Business Score

## Opportunity Score
Give a score from 1-10 and explain why.

## Difficulty Score
Give a score from 1-10 and explain why.

## Profit Potential
Give a score from 1-10 and explain why.

# Target Audience

# First Product To Sell

# Content Strategy
Give exactly 10 content ideas.

# Business Roadmap

## Days 1-7

## Days 8-14

## Days 15-30

# Risks

# Final Verdict
Give a clear recommendation: Start / Test First / Avoid.
`,

      names: `
You are Heybabe AI, a premium brand naming expert.

Return your answer EXACTLY in Markdown format.
Every main section title MUST start with "#".
Use bullet points and short explanations.

Generate business name ideas for this business:

${idea}

Use this exact structure:

# Business Name Ideas

Give 20 name ideas.

# Best 5 Names

Choose the 5 strongest names and explain why.

# Luxury / Premium Names

Give 10 premium-sounding names.

# Cute / Friendly Names

Give 10 cute and approachable names.

# Short Domain-Friendly Names

Give 10 short names that could work as a domain or social media handle.

# Final Recommendation

Pick the best name overall and explain why.
`,

      content: `
You are Heybabe AI, a content strategist for beginner online founders.

Return your answer EXACTLY in Markdown format.
Every main section title MUST start with "#".
Use bullet points, numbered lists, and bold text.

Create content ideas for this business:

${idea}

Use this exact structure:

# Content Strategy Overview

# TikTok / Reels Ideas

Give 20 short-form video ideas.

# Instagram Post Ideas

Give 10 post ideas.

# Hook Ideas

Give 20 attention-grabbing hooks.

# 7-Day Content Plan

Give a simple 7-day posting plan.

# Final Content Advice

Give practical advice for a beginner founder.
`,

      ebook: `
You are Heybabe AI, an ebook business strategist for beginner online founders.

Return your answer EXACTLY in Markdown format.
Every main section title MUST start with "#".
Every subsection title MUST start with "##".
Use bullet points, numbered lists, and bold text.

Create a complete ebook business plan for this business idea:

${idea}

Use this exact structure:

# Ebook Overview

# Target Audience

# Ebook Title Ideas
Give 20 ebook title ideas.

# Best Ebook Angle

Explain the strongest angle for this ebook.

# Ebook Table of Contents

## Introduction

## Chapter 1

## Chapter 2

## Chapter 3

## Chapter 4

## Chapter 5

## Bonus Section

# Lead Magnet Ideas
Give 10 lead magnet ideas.

# Pricing Strategy

# Sales Funnel

# Content Marketing Plan

# 30-Day Launch Plan

## Days 1-7

## Days 8-14

## Days 15-30

# Final Recommendation
Give clear advice for launching this ebook.
`,
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompts[mode] || prompts.analyze,
    });

    return Response.json({
      result: response.text,
    });
  } catch (error: any) {
    console.error("GEMINI ERROR:", error);

    return Response.json(
      {
        error: error.message || "Something went wrong",
      },
      {
        status: 500,
      }
    );
  }
}