import { Inject, Injectable } from "@nestjs/common";
import { CONTACT_REPOSITORY, type ContactRepository } from "../services/contact.repository";

@Injectable()
export class GetContactUseCase {
  public constructor(
    @Inject(CONTACT_REPOSITORY)
    private readonly contactRepository: ContactRepository,
  ) {}

  public async execute(contactId: string) {
    return this.contactRepository.getById(contactId);
  }
}
