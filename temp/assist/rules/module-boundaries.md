# Module Boundary Rules

- A module is a bounded context, not a technical folder.
- Modules must communicate through public contracts, application ports, or events.
- Domain code must not import NestJS, Kysely, HTTP, GraphQL, Electron, or Next.js.
- Infrastructure code may implement ports from application code.
- Interface code may call application use cases.
- Cross-module database joins are not allowed by default.
- Shared packages must stay generic and must not become hidden business modules.
