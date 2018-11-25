import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  root(): string {
    return 'DriveIM - API Version 2';
  }
}
