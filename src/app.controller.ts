import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { ProcessYoutubeVideoDTO } from './dto/process-youtube-video.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getHello(): Promise<string> {
    return this.appService.getHello();
  }

  @Post('/process-youtube-video')
  async processYoutubeVideo(
    @Body() body: ProcessYoutubeVideoDTO,
  ): Promise<boolean> {
    return this.appService.processYoutubeVideo(body.videoUrl);
  }
}
