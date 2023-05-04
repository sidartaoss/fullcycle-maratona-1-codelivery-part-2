import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./app.module";
import * as expressHbs from "express-handlebars";
import * as handlebarsHelpers from "handlebars-helpers";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const hbs = expressHbs.create({
    helpers: {
      ...handlebarsHelpers(),
    },
    extname: ".hbs",
    defaultLayout: "layout",
    partialsDir: [join(__dirname, "..", "views")],
  });

  app.engine("hbs", hbs.engine);
  app.setViewEngine("hbs");

  await app.listen(process.env.APP_PORT);
}
bootstrap();
