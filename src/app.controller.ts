import { Body, Controller, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { ProcessYoutubeVideoDTO } from './dto/process-youtube-video.dto';
import { VideoConversationDTO } from './dto/video-conversation.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/video/:id/conversation')
  async videoConversation(
    @Param('id') id: string,
    @Body() body: VideoConversationDTO,
  ): Promise<string> {
    return this.appService.videoConversation(id, body.message);
  }

  @Post('/process-youtube-video')
  async processYoutubeVideo(
    @Body() body: ProcessYoutubeVideoDTO,
  ): Promise<boolean> {
    return this.appService.processYoutubeVideo(body.videoUrl);
  }
}
