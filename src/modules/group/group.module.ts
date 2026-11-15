import { Module } from '@nestjs/common';
import { MessageModule } from '../message/message.module';
import { GroupCollectorController } from './group-collector.controller';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';

@Module({
  imports: [MessageModule],
  controllers: [GroupCollectorController, GroupController],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {}
