import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MemberService } from './member.service';

@ApiTags('Member')
@Controller('member')
export class MemberController {
  constructor(private memberService: MemberService) {}

  @Get()
  @ApiOperation({ summary: '获取当前用户会员信息' })
  async getMembership(@Req() req: any) {
    return this.memberService.getMembership(req.user?.sub);
  }
}
