import { VercelRequest, VercelResponse } from "@vercel/node";
const { performance } = require("perf_hooks");
const sharp = require("sharp");
const fetch = require("node-fetch");

export default async (request: VercelRequest, response: VercelResponse) => {
  const t0 = performance.now();
  console.log("input data", request.query, request.headers.accept);

  const outputFormat =
    request.headers?.accept?.split(",")?.find((el) => el.includes("image/")) ||
    "image/jpeg";
  let format = request.query.f || outputFormat.split("/")?.[1] || "jpeg";

  // image/webp,*/*
  // image/avif,image/webp,image/apng,image/*,*/*;q=0.8

  const preferredWith = parseInt(request.query.w as string) || null;
  const preferredHeight = parseInt(request.query.h as string) || null;
  console.log("input dimentions", preferredWith, preferredHeight);
  console.log("desired output format", outputFormat, format);

  // const { name = "World" } = request.query;
  // // console.error('is it a log??', request.query)
  // response.status(200).send(`Hello ${name}!`);
  try {
    const imageFromAPI = await fetch(
      `https://pwa-demo-api.shopware.com/prev/${request.query.url}`
      // {
      //   responseType: "arraybuffer",
      // }
    );
    const t1 = performance.now();
    // const bf = await imageFromAPI.buffer()
    const buffer = await imageFromAPI.buffer(); // Buffer.from(imageFromAPI.data, "binary");
    // const buffer = Buffer.from(bf, "binary");
    let result = await sharp(buffer);
    if (preferredWith || preferredHeight) {
      result = await result.resize({
        width: preferredWith,
        height: preferredHeight,
      });
    }
    // .avif({ quality: 60, speed: 7 })
    switch (format) {
      // result = await result.avif({ quality: 60, speed: 8 });
      // break;
      case "avif":
      case "webp":
        result = await result.webp({ quality: 60, reductionEffort: 5 });
        format = "webp";
        break;
      default:
        result = await result.jpeg({ quality: 70 });
        format = "jpeg";
        break;
    }
    result = await result.toBuffer();

    // console.error('IMAGE FROM API',

    // response.send({ data: 'data' })
    const t2 = performance.now();
    console.log(
      `Image load: ${Math.round(t1 - t0)} ms; processing ${Math.round(
        t2 - t1
      )} ms; Whole endpoint ${Math.round(t2 - t0)} ms`
    );
    // const period = 60 * 5; // 5 min
    // response.set("Cache-control", `public, max-age=${period}`);
    // response.contentType(outputFormat);
    // response.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate')
    console.log("-> format", `image/${format}`);
    response.setHeader("Cache-Control", "max-age=86400, s-maxage=86400");
    response.setHeader("Content-Type", `image/${format}`);
    response.end(result, "binary");
  } catch (e) {
    const tEnd = performance.now();
    console.error(`Fatal error (${Math.round(tEnd - t0)} ms);`, e);
    response.send("Could not process image.");
  }
};
