# LaunchDarkly Onboarding Skill

End-to-end orchestrator that takes a project from "no LaunchDarkly anywhere" to a working first feature flag, with the SDK installed, MCP configured, and a durable summary doc left behind.

## Why this exists

LaunchDarkly onboarding is a multi-step process that touches the editor, the package manager, the LaunchDarkly dashboard, the codebase, and the running app. Done by hand it takes 30-60 minutes and skips easily — agents tend to hardcode keys, install the wrong SDK, or forget to verify the flag actually works end-to-end.

This skill encodes the full workflow as a deterministic checklist with decision points and resumable state, so an agent can run it once and get the user to a "wow, that toggle just changed prod" moment without manual intervention at each step.

## What it does

- Presents a friendly **kickoff roadmap** in chat so the user knows the arc before any code changes.
- Writes a working `LAUNCHDARKLY_ONBOARDING.md` log so a new session or another agent can resume from the recorded next step.
- Detects the project's language, framework, package manager, and existing LaunchDarkly usage.
- Detects the host coding agent (Cursor, Claude Code, Windsurf, Copilot, Codex) and installs the matching companion flag-management skills.
- Configures the LaunchDarkly **hosted MCP server** (OAuth) by handing off to [`mcp-configure`](mcp-configure/SKILL.md).
- Installs and initializes the **right SDK** for the detected stack — server-side, browser, mobile, or edge — by handing off to [`sdk-install`](sdk-install/SKILL.md) (which runs **detect → plan → apply** internally).
- Creates a **first boolean feature flag**, wires evaluation in code, and verifies the off → on → off cycle by handing off to [`first-flag`](first-flag/SKILL.md).
- Replaces the working log with a permanent `LAUNCHDARKLY.md` summary that documents the SDK, env vars, dashboard links, and AI agent integration.

It does **not** create flags before the SDK is installed, modify non-LaunchDarkly dependencies without explicit consent, hardcode SDK keys in source, or restructure the project.

## Decision points

The workflow has explicit blocking decision points where the agent stops and asks the user a structured question:

| ID | Where | Question |
|---|---|---|
| D5 | Step 5 -- detect | Which SDK / which language / which package to integrate (monorepo, multi-language, no runnable app)? |
| D7 | Step 5 -- apply | How are secrets set up: user-specified location, user handles, or `.env` fallback? |
| D8 | Step 5 -- apply | Approval before changing non-LaunchDarkly dependencies. |
| D9 | Step 6 | Auth errors (401/403): stop, do not retry. |

These are tool-call decision points — the skill instructs the agent to use its native question tool (e.g. `AskQuestion` in Cursor) instead of writing the question as prose.

## Installation

This skill is part of the `launchdarkly/ai-tooling` plugin and ships alongside [`onboarding-router`](../onboarding-router/), which routes generic "onboard me" requests into this skill (the Feature Flags path).

- **Claude Code / Cursor:** install the LaunchDarkly plugin and call `/onboarding`, or just say "onboard me to LaunchDarkly" — the router picks this skill automatically when the request matches the flags path.
- **Other agents:** copy `skills/onboarding/` into your agent's skills path, or `npx skills add launchdarkly/ai-tooling --skill onboarding -y --agent <agent-id>`.

## Usage

```
Onboard me to LaunchDarkly
```

```
Set up LaunchDarkly in this Next.js project, project key is web-app
```

```
Continue setting up LaunchDarkly
```

(If a `LAUNCHDARKLY_ONBOARDING.md` log already exists, the skill resumes from the recorded next step instead of restarting.)

## Structure

```
onboarding/
├── SKILL.md                    # main orchestrator workflow
├── README.md                   # this file
├── marketplace.json            # plugin metadata
├── mcp-configure/              # nested skill: Step 4 (MCP)
├── sdk-install/                # nested skill: Step 5 (detect → plan → apply)
├── first-flag/                 # nested skill: Step 6 (first flag)
└── references/
    ├── 1.8-summary.md          # template for the permanent LAUNCHDARKLY.md
    ├── 1.9-editor-rules.md     # editor rule / skill hooks per agent
    └── sdk/
        ├── recipes.md          # per-SDK install + init recipes
        └── snippets/           # reusable code snippets per language
```

## Related

- [Onboarding Router](../onboarding-router/) — picks this skill (or AgentControl / Experiments / Observability) based on user intent.
- [`launchdarkly-flag-create`](../feature-flags/launchdarkly-flag-create/) — installed during Step 3 and used optionally during Step 6.
- [`launchdarkly-flag-discovery`](../feature-flags/launchdarkly-flag-discovery/), [`launchdarkly-flag-targeting`](../feature-flags/launchdarkly-flag-targeting/), [`launchdarkly-flag-cleanup`](../feature-flags/launchdarkly-flag-cleanup/) — companion flag-management skills installed in Step 3.

## License

Apache-2.0

<!-- eval-score:start -->
_Eval score not yet recorded._
<!-- eval-score:end -->
