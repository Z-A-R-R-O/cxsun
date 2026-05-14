import { Controller, Get } from "@nestjs/common";

interface HealthResponse {
  readonly status: "ok";
  readonly service: "cxnext-server";
  readonly timestamp: string;
}

@Controller("health")
export class HealthController {
  @Get()
  public getHealth(): HealthResponse {
    return {
      status: "ok",
      service: "cxnext-server",
      timestamp: new Date().toISOString(),
    };
  }
}
