import express from "express";
import spdy from "spdy";
import fs from "fs";

const app = express();
const receivers = new Map();

app.post("/send", (req, res) => {
  const room = req.query.room;
  if (!room) {
    res.status(400).send("No room given");
    return;
  }

  res.status(200);

  req.on("data", (chunk) => {
    const set = receivers.get(room);
    if (!set) return;
    for (const res of set) res.write(chunk);
  });

  req.on("end", (chunk) => {
    if (res.writableEnded) return;
    res.send("Ended");
  });
});

app.get("/receive", (req, res) => {
  const room = req.query.room;
  if (!room) {
    res.status(400).send("No room given");
    return;
  }

  if (!receivers.has(room)) {
    receivers.set(room, new Set());
  }

  receivers.get(room).add(res);

  res.on("close", () => {
    const set = receivers.get(room);
    set.delete(res);
    if (set.size === 0) receivers.delete(room);
  });

  res.status(200);
  res.set("Content-Type", "text/plain");
});

app.use(express.static("static"));

const port = process.env.PORT || 3000;
spdy
  .createServer(
    {
      key: fs.readFileSync("./server.key"),
      cert: fs.readFileSync("./server.crt"),
    },
    app
  )
  .listen(port, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`Listening on port ${port}`);
  });
