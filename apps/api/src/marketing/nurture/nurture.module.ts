import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NurtureSequence } from './entities/nurture-sequence.entity';
import { NurtureEnrollment } from './entities/nurture-enrollment.entity';
import { NurtureService } from './nurture.service';
import { NurtureController } from './nurture.controller';
import { ContactsModule } from '../../crm/contacts/contacts.module';
import { EmailModule } from '../../common/email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([NurtureSequence, NurtureEnrollment]), ContactsModule, EmailModule],
  providers: [NurtureService],
  controllers: [NurtureController],
  exports: [NurtureService],
})
export class NurtureModule {}
