import { Controller, Get, Post, Render, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('')
  @Render('index.hbs')
  indexPage() {
    return { message: 'Hello world!' };
  }

  @Get('/custom')
  @Render('custom.hbs')
  filePondPage() {
    return { message: 'Hello world!' };
  }

  @Get('/success')
  @Render('success.hbs')
  successPage() {
    return { data: 'Hello world!' };
  }

  @Post('/upload-site')
  uploadSite(@Req() req, @Res() res) {
    return this.appService.uploadSite(req, res)
  }
}
