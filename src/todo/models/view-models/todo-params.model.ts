import { ApiModelProperty } from '@nestjs/swagger';
import { EnumToArray } from '../../../shared/utilities/enum-to-array';
import { TodoLevel } from '../todo-level.enum';

export class TodoParams {
  @ApiModelProperty() content: string;
  @ApiModelProperty({enum: EnumToArray(TodoLevel), example: TodoLevel.Normal})
  level ?: TodoLevel;
}
