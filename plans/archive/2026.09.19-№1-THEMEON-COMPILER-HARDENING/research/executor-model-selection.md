# Executor model research — 2026-09-19

## Verified primary-source facts

- Cursor documents `composer-2.5` as its own agentic model, with a 200k context window, stronger
  long-agent-task behavior, effort calibration, tool selection and reliability. The same page says
  it has all Cursor agent tools and shares the Cursor Models pool with Cursor Grok 4.6.
- Cursor's release article says Composer 2.5 was trained on harder tasks and 25× more synthetic
  tasks than Composer 2; standard pricing is $0.50/M input and $2.50/M output.
- Cursor documents the exact selector `grok-4.6`, a 256k Cursor context window, all Cursor agent
  tools and low/medium/high/xhigh effort (high default). Cursor's India-only Start plan fixes Grok
  4.6 at medium effort, so it does not satisfy this plan's `frontier/high` routes.
- xAI describes the same model family as focused on long-running agents and documents a separate
  API surface with a 500k context window, low/medium/high/xhigh reasoning, function calling and
  $2/M input / $6/M output pricing. The 500k figure must not be attributed to Cursor execution.

Primary URLs (retrieved 2026-09-19):

- https://cursor.com/docs/models/cursor-composer-2-5
- https://cursor.com/docs/models/grok-4-6
- https://cursor.com/docs/models-and-pricing
- https://cursor.com/blog/composer-2-5
- https://x.ai/news/grok-4-6
- https://docs.x.ai/developers/models/grok-4.6

## Search and Perplexity record

- Native web search was attempted twice and direct open was attempted once; the connector returned
  `connection failed: error sending request`. DuckDuckGo HTML search plus direct retrieval of the
  official pages above provided the primary-source fallback.
- The configured local Perplexity MCP (`perplexity-web-mcp` 1.4.0) was queried twice. Its synthesis
  agreed on the broad positioning, context and pricing distinctions. Both replies emitted only
  domain labels rather than usable source URLs, despite an explicit URL request, so Perplexity is
  corroboration only and no plan claim depends solely on it.
- `agent --list-models` was also attempted locally and failed with `getaddrinfo EAI_AGAIN
  api2.cursor.sh`. Therefore availability must be re-attested at each execution launch.

## Selection rule

This is a plan-specific operational rule, not a vendor benchmark claim: Composer 2.5 is preferred
for bounded edits with frozen contracts; Grok 4.6 is preferred for broad cross-package context,
security/adversarial reasoning and long integration trajectories. The per-item table in `plan.md`
is authoritative. Availability, route class and effort are checked at launch; fallback never means
automatic model selection or reduced review.
