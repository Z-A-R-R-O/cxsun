import { Controller, Get, Inject, Param } from "@nestjs/common";
import { RequirePermissions } from "../../auth/interface/http/auth-context";
import { modulePermission } from "../../auth/interface/http/module-permissions";
import { CreateCommonLocationRecordUseCase } from "../application/use-cases/location/create-common-location-record.use-case";
import { DeleteCommonLocationRecordUseCase } from "../application/use-cases/location/delete-common-location-record.use-case";
import { GetCommonLocationRecordUseCase } from "../application/use-cases/location/get-common-location-record.use-case";
import { ListCommonLocationRecordsUseCase } from "../application/use-cases/location/list-common-location-records.use-case";
import { UpdateCommonLocationRecordUseCase } from "../application/use-cases/location/update-common-location-record.use-case";
import { CommonLocationControllerBase } from "../interface/http/common-location-controller";

@Controller("common/states")
@RequirePermissions(modulePermission("common", "read"))
export class StatesController extends CommonLocationControllerBase {
  public constructor(
    @Inject(ListCommonLocationRecordsUseCase)
    listCommonLocationRecordsUseCase: ListCommonLocationRecordsUseCase,
    @Inject(GetCommonLocationRecordUseCase)
    getCommonLocationRecordUseCase: GetCommonLocationRecordUseCase,
    @Inject(CreateCommonLocationRecordUseCase)
    createCommonLocationRecordUseCase: CreateCommonLocationRecordUseCase,
    @Inject(UpdateCommonLocationRecordUseCase)
    updateCommonLocationRecordUseCase: UpdateCommonLocationRecordUseCase,
    @Inject(DeleteCommonLocationRecordUseCase)
    deleteCommonLocationRecordUseCase: DeleteCommonLocationRecordUseCase,
  ) {
    super(
      "states",
      listCommonLocationRecordsUseCase,
      getCommonLocationRecordUseCase,
      createCommonLocationRecordUseCase,
      updateCommonLocationRecordUseCase,
      deleteCommonLocationRecordUseCase,
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
