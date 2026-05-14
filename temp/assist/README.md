# cxnext Assist Guide

This repository is a production-grade foundation for a TypeScript modular monolith. It contains platform structure, base wiring, DDD primitives, event abstractions, and governance material only. It does not contain business modules.

## How AI Should Understand This Repo

AI agents must treat `cxnext` as a single deployable backend with strict internal bounded contexts, supported by shared packages and frontend/desktop shells. Future work should extend the architecture by adding modules that follow established boundaries, not by adding cross-cutting shortcuts.

The repo is organized around three layers of intent:

- `apps/`: deployable applications.
- `packages/`: shared platform primitives and infrastructure abstractions.
- `assist/`: AI-native memory, rules, and standards that govern future generation.

## Required Start Sequence

Before every meaningful execution batch, AI agents must read this file, `assist/agent.md`, and the task-relevant files under `assist/rules` and `assist/standards`. Do not begin implementation from partial assist context.

Execution tracking is mandatory for every meaningful change. Before writing code, changing repository files, or running validation for a batch, create or refresh:

- `assist/execution/task.md`
- `assist/execution/planning.md`

The active reference in those files must match package version `1.0.<reference>`, release tag `v-1.0.<reference>`, and the matching `assist/documentation/CHANGELOG.md` section when release tracking is active.

## Architecture Philosophy

The backend is a modular monolith. It is deployed as one NestJS application, but each future bounded context must be isolated, independently testable, and accessed through public contracts, application ports, or events.

Domain-Driven Design is the default modeling discipline. Future modules must place domain behavior in domain objects and use application use cases to coordinate work. Infrastructure adapts external systems; it must not own business rules.

Events are first-class. Domain events represent meaningful facts that happened in the model. The current event bus is in-process and async-ready so it can later be backed by BullMQ, an outbox, or a broker without changing module contracts.

## How Modules Must Be Created

Create future backend modules under `apps/server/src/modules/<module-name>` using this structure:

```text
domain/
  entities/
  value-objects/
  aggregates/
  events/
application/
  use-cases/
  services/
infrastructure/
  persistence/
  adapters/
interface/
  graphql/
  http/
```

Each module must expose only deliberate public contracts. Do not import another module's domain, application, or infrastructure internals.

## Rules For Code Generation

- Do not generate business domains unless explicitly requested.
- Do not add ecommerce, auth, payments, catalog, order, billing, or user flows to the foundation.
- Prefer package primitives from `@cxnext/core`, `@cxnext/event`, `@cxnext/utils`, and `@cxnext/validation`.
- Keep dependencies flowing inward: interface and infrastructure may depend on application/domain; domain may not depend on framework code.
- Register future modules through the module registry.
- Publish events through the event bus instead of directly invoking unrelated modules.
- Keep source files under 700 lines. Review files at 500 lines and split them unless cohesion clearly requires keeping them together.
- Follow `assist/rules/coding-style.md`, `assist/rules/versioning-and-releases.md`, `assist/rules/branching-and-commits.md`, and `assist/rules/strict-module-structure.md` for all generated work.
- Follow `assist/rules/sidebar-navigation.md` before changing desk sidebar navigation or Organisation accordion behavior.
- Follow `assist/rules/execution-tracking.md` before every meaningful execution batch.

## Event-Driven Approach

Use `@cxnext/event` for internal events:

- `BaseEvent` defines the event contract.
- `EventBus` defines publish/subscribe behavior.
- `InMemoryEventBus` is the default runtime implementation.
- `EventHandler` defines handler classes/functions.

Future async processing should keep the same interfaces and replace the adapter, not the calling code.

## DDD Usage

Use `@cxnext/core` for:

- `Entity`
- `AggregateRoot`
- `ValueObject`
- `DomainEvent`
- `BaseModule`
- `ModuleRegistry`

Aggregates collect domain events and release them through `pullDomainEvents()`. Application use cases coordinate persistence and event publication.
