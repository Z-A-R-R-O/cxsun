import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { ContactGroupsController } from "./contact-groups.controller";

@Module({
  controllers: [ContactGroupsController],
  providers: [...commonMasterProviders],
})
export class ContactGroupsModule {}
