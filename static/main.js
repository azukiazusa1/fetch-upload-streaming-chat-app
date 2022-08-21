const init = () => {
  const input = document.querySelector("#input");
  const form = document.querySelector("#form");
  const messages = document.querySelector("#messages");
  const quit = document.querySelector("#quit");

  const roomId = new URLSearchParams(window.location.search).get("roomId");
  if (!roomId) {
    alert("No roomId given");
    return;
  }

  const supportRequestStreams = (() => {
    let duplexAccessed = false;

    const hasContentType = new Request("", {
      body: new ReadableStream(),
      method: "POST",
      get duplex() {
        duplexAccessed = true;
        return "half";
      },
      allowHTTP1ForStreamingUpload: true,
    }).headers.has("Content-Type");

    return duplexAccessed && !hasContentType;
  })();

  if (!supportRequestStreams) {
    alert("Your browser does not support request streams");
    return;
  }

  const stream = new ReadableStream({
    start(controller) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const message = input.value;
        controller.enqueue(message);
        input.value = "";
      });

      quit.addEventListener("click", () => controller.close());
    },
  }).pipeThrough(new TextEncoderStream());

  fetch(`/send?room=${roomId}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: stream,
    duplex: "half",
  });

  fetch(`/receive?room=${roomId}`).then(async (res) => {
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      const newMessage = document.createElement("li");
      messages.appendChild(newMessage);
      newMessage.innerText = `${newMessage.innerText}${value}`;
    }
  });
};

init();
