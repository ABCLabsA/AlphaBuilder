import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const config = app.get(ConfigService);
  const port = config.get<number>("PORT", 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend API listening on port ${port}`);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Fatal bootstrap error", error);
  process.exit(1);
});
