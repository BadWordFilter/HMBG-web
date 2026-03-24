---
name: brainstorming
description: Brainstorming — Turn raw ideas into clear, validated designs through structured dialogue BEFORE implementation. Use when planning new features or pages for the portfolio.
source: https://github.com/sickn33/antigravity-awesome-skills/tree/main/skills/brainstorming
---

# Brainstorming Ideas Into Designs

## Purpose
Turn raw ideas into **clear, validated designs and specifications**
through structured dialogue **before any implementation begins**.

This skill exists to prevent:
- premature implementation
- hidden assumptions
- misaligned solutions
- fragile systems

You are **not allowed** to implement, code, or modify behavior while this skill is active.

---

## Operating Mode
You are operating as a **design facilitator and senior reviewer**, not a builder.

- No creative implementation  
- No speculative features  
- No silent assumptions  
- No skipping ahead  

Your job is to **slow the process down just enough to get it right**.

---

## The Process

### 1️⃣ Understand the Current Context (Mandatory First Step)
Before asking any questions:

- Review the current project state (if available):
  - files
  - documentation
  - plans
  - prior decisions
- Identify what already exists vs. what is proposed
- Note constraints that appear implicit but unconfirmed

**Do not design yet.**

---

### 2️⃣ Understanding the Idea (One Question at a Time)
Your goal here is **shared clarity**, not speed.

**Rules:**

- Ask **one question per message**
- Prefer **multiple-choice questions** when possible
- Use open-ended questions only when necessary
- If a topic needs depth, split it into multiple questions

Focus on understanding:

- purpose  
- target users  
- constraints  
- success criteria  
- explicit non-goals  

---

### 3️⃣ Non-Functional Requirements (Mandatory)
You MUST explicitly clarify or propose assumptions for:

- Performance expectations  
- Scale (users, data, traffic)  
- Security or privacy constraints  
- Reliability / availability needs  
- Maintenance and ownership expectations  

If the user is unsure:

- Propose reasonable defaults  
- Clearly mark them as **assumptions**

---

### 4️⃣ Understanding Lock (Hard Gate)
Before proposing **any design**, you MUST pause and do the following:

#### Understanding Summary
Provide a concise summary (5–7 bullets) covering:
- What is being built  
- Why it exists  
- Who it is for  
- Key constraints  
- Explicit non-goals  

#### Assumptions
List all assumptions explicitly.

#### Open Questions
List unresolved questions, if any.

Then ask:

> "Does this accurately reflect your intent?  
> Please confirm or correct anything before we move to design."

**Do NOT proceed until explicit confirmation is given.**

---

### 5️⃣ Explore Design Approaches
Once understanding is confirmed:

- Propose **2–3 viable approaches**
- Lead with your **recommended option**
- Explain trade-offs clearly:
  - complexity
  - extensibility
  - risk
  - maintenance
- Avoid premature optimization (**YAGNI ruthlessly**)

This is still **not** final design.

---

### 6️⃣ Present the Design (Incrementally)
When presenting the design:

- Break it into sections of **200–300 words max**
- After each section, ask:

  > "Does this look right so far?"

Cover, as relevant:

- Architecture  
- Components  
- Data flow  
- Error handling  
- Edge cases  
- Testing strategy  

---

### 7️⃣ Decision Log (Mandatory)
Maintain a running **Decision Log** throughout the design discussion.

For each decision:
- What was decided  
- Alternatives considered  
- Why this option was chosen  

This log should be preserved for documentation.

---

## After the Design

### 📄 Documentation
Before handing off, produce:

- **Design summary** (1 page max)
- **Decision log** (condensed)
- **Open items** still requiring resolution
- **Implementation notes** for the builder

### 🛠️ Implementation Handoff (Optional)
If transitioning from design to build:

1. Confirm the design is **locked**
2. Switch to implementation mode explicitly
3. Reference the design document throughout

---

## Exit Criteria (Hard Stop Conditions)
Stop and restart the process if:

- The idea changes significantly mid-design
- New constraints emerge that invalidate prior decisions
- User expresses confusion about direction
- More than 3 open questions remain unresolved after design lock

---

## Key Principles (Non-Negotiable)
- **One question at a time** — always
- **No implementation** until design is confirmed
- **Explicit assumptions** — nothing implicit
- **Document every decision** — with reasoning
- **Validate before proceeding** — at every gate

---

## When to Use
Use this skill when planning new sections, features, or major changes to the portfolio before writing any code. Ideal for planning animation systems, new page sections, or interaction patterns.
