import { ApiBearerAuth, ApiImplicitQuery, ApiOperation, ApiResponse, ApiUseTags } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { isArray, map } from 'lodash';

import { TodoService } from './todo.service';
import { TodoParams } from './models/view-models/todo-params.model';
import { TodoVm } from './models/view-models/todo-vm.model';
import { ApiException } from '../shared/api-exception.model';
import { GetOperationId } from '../shared/utilities/get-operation-id';
import { Todo } from './models/todo.model';
import { TodoLevel } from './models/todo-level.enum';
import { ToBooleanPipe } from '../shared/pipes/to-boolean.pipe';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../user/models/user-role.enum';
import { RolesGuards } from '../shared/guards/roles.guards';
import { AuthGuard } from '@nestjs/passport';

@Controller('todos')
@ApiUseTags(Todo.modelName)
@ApiBearerAuth()
export class TodoController {
  constructor(private readonly _todoService: TodoService) {
  }

  @Post()
  @Roles(UserRole.Admin)
  @UseGuards(AuthGuard('jwt'), RolesGuards)
  @ApiResponse({status: HttpStatus.CREATED, type: TodoVm})
  @ApiResponse({status: HttpStatus.BAD_REQUEST, type: ApiException})
  @ApiOperation(GetOperationId((Todo.modelName), 'Create'))
  async create(@Body() params: TodoParams): Promise<TodoVm> {
    const {content} = params;

    if (!content) {
      throw new HttpException('Content is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const newTodo = await this._todoService.createTodo(params);
      return this._todoService.map<TodoVm>(newTodo);
    } catch (e) {
      throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  @Roles(UserRole.Admin, UserRole.User)
  @UseGuards(AuthGuard('jwt'), RolesGuards)
  @ApiResponse({status: HttpStatus.OK, type: TodoVm})
  @ApiResponse({status: HttpStatus.BAD_REQUEST, type: ApiException})
  @ApiOperation(GetOperationId((Todo.modelName), 'GetAll'))
  @ApiImplicitQuery({name: 'level', required: false, isArray: true, collectionFormat: 'multi'})
  @ApiImplicitQuery({name: 'isCompleted', required: false})
  async get(
    @Query('level') level ?: TodoLevel,
    @Query('isCompleted', new ToBooleanPipe())
    isCompleted ?: boolean,
  ): Promise<TodoVm[]> {
    try {
      let filter = {} as any;

      if (level) {
        filter.level = {
          $in: isArray(level) ? [...level] : [level],
        };
      }

      if (isCompleted !== null) {
        if (filter.level) {
          filter = {
            $and: [{level: filter.level}, {isCompleted}],
          };
        }
        else {
          filter.isCompleted = isCompleted;
        }
      }

      const todos = await this._todoService.findAll(filter);
      const todosJSON = map(todos, todo => todo.toJSON());

      return this._todoService.map<TodoVm[]>(todosJSON);
    } catch (e) {
      throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put()
  @ApiResponse({status: HttpStatus.CREATED, type: TodoVm})
  @ApiResponse({status: HttpStatus.BAD_REQUEST, type: ApiException})
  @ApiOperation(GetOperationId((Todo.modelName), 'Update'))
  async update(@Body() vm: TodoVm): Promise<TodoVm> {
    const {id, content, level, isCompleted} = vm;

    if (!vm || !id) {
      throw new HttpException('Missing parameters', HttpStatus.BAD_REQUEST);
    }

    const exist = await this._todoService.findById(id);

    if (!exist) {
      throw new HttpException(`${id} Not found`, HttpStatus.NOT_FOUND);
    }

    if (exist.isCompleted) {
      throw new HttpException('Already completed', HttpStatus.BAD_REQUEST);
    }

    exist.content = content;
    exist.isCompleted = isCompleted;
    exist.level = level;

    try {
      const updated = await this._todoService.update(id, exist);
      return this._todoService.map<TodoVm>(updated.toJSON());
    } catch (e) {
      throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @Roles(UserRole.Admin)
  @ApiResponse({status: HttpStatus.OK, type: TodoVm})
  @ApiResponse({status: HttpStatus.BAD_REQUEST, type: ApiException})
  @ApiOperation(GetOperationId((Todo.modelName), 'Delete'))
  async delete(@Param('id') id: string): Promise<TodoVm> {
    try {
      const exist = await this._todoService.findById(id);

      if (!exist) {
        throw new HttpException(`${id} Not found`, HttpStatus.NOT_FOUND);
      }

      const deleted = await this._todoService.delete(id);
      return this._todoService.map<TodoVm>(deleted.toJSON());
    } catch (e) {
      throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
