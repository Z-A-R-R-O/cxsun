import { Controller, Get, Inject, Param } from "@nestjs/common";
import { RequirePermissions } from "../../auth/interface/http/auth-context";
import { modulePermission } from "../../auth/interface/http/module-permissions";
import { CreateCommonMasterRecordUseCase } from "../application/use-cases/contact-masters/create-common-master-record.use-case";
import { DeleteCommonMasterRecordUseCase } from "../application/use-cases/contact-masters/delete-common-master-record.use-case";
import { GetCommonMasterRecordUseCase } from "../application/use-cases/contact-masters/get-common-master-record.use-case";
import { ListCommonMasterRecordsUseCase } from "../application/use-cases/contact-masters/list-common-master-records.use-case";
import { UpdateCommonMasterRecordUseCase } from "../application/use-cases/contact-masters/update-common-master-record.use-case";
import { CommonMasterControllerBase } from "../interface/http/common-master-controller";

@Controller("common/product-categories")
@RequirePermissions(modulePermission("common", "read"))
export class ProductCategoriesController extends CommonMasterControllerBase {
  public constructor(
    @Inject(ListCommonMasterRecordsUseCase)
    listCommonMasterRecordsUseCase: ListCommonMasterRecordsUseCase,
    @Inject(GetCommonMasterRecordUseCase)
    getCommonMasterRecordUseCase: GetCommonMasterRecordUseCase,
    @Inject(CreateCommonMasterRecordUseCase)
    createCommonMasterRecordUseCase: CreateCommonMasterRecordUseCase,
    @Inject(UpdateCommonMasterRecordUseCase)
    updateCommonMasterRecordUseCase: UpdateCommonMasterRecordUseCase,
    @Inject(DeleteCommonMasterRecordUseCase)
    deleteCommonMasterRecordUseCase: DeleteCommonMasterRecordUseCase,
  ) {
    super(
      "productCategories",
      listCommonMasterRecordsUseCase,
      getCommonMasterRecordUseCase,
      createCommonMasterRecordUseCase,
      updateCommonMasterRecordUseCase,
      deleteCommonMasterRecordUseCase,
    );
  }

  @Get()
  public list() {
    return this.listRecords();
  }

  @Get(":id")
  public getById(@Param("id") id: string) {
    return this.getRecord(id);
  }
}
