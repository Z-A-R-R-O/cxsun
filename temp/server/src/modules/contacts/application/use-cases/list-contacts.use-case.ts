import { Inject, Injectable } from "@nestjs/common";
import { CONTACT_REPOSITORY, type ContactRepository } from "../services/contact.repository";

@Injectable()
export class ListContactsUseCase {
  public constructor(
    @Inject(CONTACT_REPOSITORY)
    private readonly contactRepository: ContactRepository,
  ) {}

  public async execute() {
    return this.contactRepository.list();
  }
}
