import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: '获取当前用户信息' })
  async getProfile(@Req() req: any) {
    return this.userService.findById(req.user?.sub);
  }

  @Patch('profile')
  @ApiOperation({ summary: '更新用户信息' })
  async updateProfile(@Req() req: any, @Body() body: { nickname?: string; avatar?: string }) {
    return this.userService.updateProfile(req.user?.sub, body);
  }
}
