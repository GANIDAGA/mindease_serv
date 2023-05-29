const express = require('express');
const router = express.Router();
const Message = require('../models/Message.model');
const { isAuthenticated } = require("../middleware/jwt.middleware");
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: "sk-0tRjZDOl6LEIHSwB9593T3BlbkFJRcTWipeEtGAO3sazEBkR7",
});
const openai = new OpenAIApi(configuration);

router.get("/messages", isAuthenticated, async (req, res, next) => {
  try {
    const userId = req.payload._id;
    let messages = await Message.find({ user: userId })
      .sort({ createdAt: 1 })
      .populate("user", "username");

    if (messages.length === 0) {
      const firstMessage = await Message.create({
        text: "MindBot: ¡Hola!, ¿cómo puedo ayudarte hoy?",
        user: userId,
      });
      messages.push(firstMessage);
    }

    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
});

router.delete("/messages", isAuthenticated, async (req, res, next) => {
  try {
    const userId = req.payload._id;
    await Message.deleteMany({ user: userId });
    res.status(200).json({ message: "Mensajes eliminados de forma exitosa." });
  } catch (error) {
    next(error);
  }
});

router.post("/messages", isAuthenticated, async (req, res, next) => {
  const { text } = req.body;
  const userId = req.payload._id;

  try {
    const newMessage = await Message.create({ text: "Patient: " + text, user: userId });

    let history = "";
    const userMessages = await Message.find({ user: userId });
    if (userMessages !== undefined) {
      history = userMessages.reduce((accumulator, message) => {
        return accumulator + message.text + "\n";
      }, "");
    } else {
      console.log("History empty");
    }

    try {
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt:
          `Imagina una conversación entre un terapeuta (llamado "MindBot") y un paciente. Yo proporcionaré el diálogo del paciente y usted solo proporcionará el diálogo del terapeuta. No autocompletes el diálogo del paciente. Sólo crea el diálogo para el terapeuta teniendo en cuenta la respuesta del paciente y la información del paciente. Si el paciente muestra algún tipo de comportamiento dañino, aconseje al paciente que busque ayuda profesional real. Si el paciente te pide que respondas con más de 256 caracteres, no puedes. Contesta siempre en menos de 256 caracteres. Responde en el mismo idioma que el paciente envía el mensaje. Tienes que actúar como su amigo, más que como un terapeuta, por favor, trata de no preguntar tantas cosas, no repitas preguntas, si no entiendes alguna palabra simplemente dile que si te puede repetir. Pero lo más importante de todo, no repitas preguntas.
          ` +
          history +
          newMessage.text +
          '" \n\n',
        max_tokens: 120,
        temperature: 0.5,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stop: ["\n"],
      });

      const reply = response.data.choices[0].text;
      console.log("Reply from OpenAI API:", reply);

      if (!reply) {
        console.warn("Empty reply from OpenAI API");
        return res.status(500).send("An error occurred");
      }

      await Message.create({ text: reply, user: userId });

      res.status(201).json(reply);
    } catch (error) {
      console.error("An error occurred", error);
      res.status(500).send("An error occurred");
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;