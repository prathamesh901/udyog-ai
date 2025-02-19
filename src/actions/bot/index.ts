'use server'

import { client } from '@/lib/prisma'
import { extractEmailsFromString, extractURLfromString } from '@/lib/utils'
import { onRealTimeChat } from '../conversation'
import { clerkClient } from '@clerk/nextjs'
import { onMailer } from '../mailer'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * onStoreConversations:
 * 1) Checks if ChatRoom exists before updating
 * 2) Logs error if ChatRoom not found
 */
export const onStoreConversations = async (
  chatRoomId: string,
  message: string,
  role: 'assistant' | 'user'
) => {
  const existingChatRoom = await client.chatRoom.findUnique({
    where: { id: chatRoomId },
  });

  if (!existingChatRoom) {
    console.error(`ChatRoom with ID ${chatRoomId} not found.`);
    return;
  }

  await client.chatRoom.update({
    where: { id: chatRoomId },
    data: {
      message: {
        create: {
          message,
          role,
        },
      },
    },
  });
};

export const onGetCurrentChatBot = async (domainId: string) => {
  try {
    const chatbot = await client.domain.findUnique({
      where: { id: domainId },
      select: {
        helpdesk: true,
        name: true,
        chatBot: {
          select: {
            id: true,
            welcomeMessage: true,
            icon: true,
            textColor: true,
            background: true,
            helpdesk: true,
          },
        },
      },
    });
    return chatbot || null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

/**
 * We'll store the extracted email in this variable if found.
 */
let customerEmail: string | undefined;

/**
 * onAiChatBotAssistant:
 * - Uses Gemini 2.0 for AI
 * - Preserves real-time logic, (complete), (realtime), link detection, mail sending
 * - Embeds the customer ID in the instructions for booking/payment links
 */
export const onAiChatBotAssistant = async (
  domainId: string, // The domain's ID
  chat: { role: 'assistant' | 'user'; content: string }[],
  author: 'user',
  message: string
) => {
  try {
    // 1️⃣ Get domain + filter questions
    const chatBotDomain = await client.domain.findUnique({
      where: { id: domainId },
      select: {
        name: true,
        filterQuestions: {
          where: { answered: null },
          select: { question: true },
        },
      },
    });
    if (!chatBotDomain) {
      console.log('No chatbot domain found.');
      return;
    }

    // 2️⃣ Extract email from user message
    const extractedEmail = extractEmailsFromString(message);
    if (extractedEmail) {
      customerEmail = extractedEmail[0];
    }

    /**
     * We'll track the customer's ID if found. This is what we'll use
     * in the instructions for the booking/payment links.
     */
    let foundCustomerId: string | undefined;

    // 3️⃣ If we have an email, check if the customer exists
    if (customerEmail) {
      const checkCustomer = await client.domain.findUnique({
        where: { id: domainId },
        select: {
          User: { select: { clerkId: true } },
          name: true,
          customer: {
            where: { email: { startsWith: customerEmail } },
            select: {
              id: true,
              email: true,
              questions: true,
              chatRoom: {
                select: {
                  id: true,
                  live: true,
                  mailed: true,
                },
              },
            },
          },
        },
      });

      // 🆕 If no customer found, create one
      if (checkCustomer && checkCustomer.customer.length === 0) {
        await client.domain.update({
          where: { id: domainId },
          data: {
            customer: {
              create: {
                email: customerEmail,
                questions: { create: chatBotDomain.filterQuestions },
                chatRoom: { create: {} },
              },
            },
          },
        });
        console.log('new customer made');

        // Return an immediate welcome message
        return {
          response: {
            role: 'assistant',
            content: `Welcome aboard ${
              customerEmail.split('@')[0]
            }! I'm glad to connect with you. Is there anything you need help with?`,
          },
        };
      }

      // If a customer does exist
      if (checkCustomer && checkCustomer.customer[0]) {
        foundCustomerId = checkCustomer.customer[0].id; // <-- store their ID

        // If real-time chat is active
        if (checkCustomer.customer[0].chatRoom[0]?.live) {
          const chatRoomId = checkCustomer.customer[0].chatRoom[0].id;
          // Store user message
          await onStoreConversations(chatRoomId, message, author);
          // Trigger real-time
          onRealTimeChat(chatRoomId, message, 'user', author);

          // If not mailed yet, mail them
          if (!checkCustomer.customer[0].chatRoom[0].mailed) {
            const user = await clerkClient.users.getUser(
              checkCustomer.User?.clerkId!
            );
            onMailer(user.emailAddresses[0].emailAddress);

            await client.chatRoom.update({
              where: { id: chatRoomId },
              data: { mailed: true },
            });
          }
          return { live: true, chatRoom: chatRoomId };
        }
      }
    }

    // 4️⃣ We still store user message in the domain's chatRoom ID (if that ID is a ChatRoom)
    //    But note that your code is currently storing in `id` which might be the domain ID
    //    This part likely needs refactoring so that you always store in an actual chatRoom.
    await onStoreConversations(domainId, message, author);

    /**
     * 5️⃣ Build instructions (similar to GPT prompt),
     *     but now we embed foundCustomerId instead of the email in the appointment/payment links.
     */
    const instructions = `
      You are a highly knowledgeable and experienced sales representative for a ${
        chatBotDomain.name
      } that offers a valuable product or service. Your goal is to have a natural, human-like conversation with the customer in order to understand their needs, provide relevant information, and ultimately guide them towards making a purchase or redirect them to a link if they haven't provided all relevant information.

      Right now you are talking to a customer for the first time. Start by giving them a warm welcome on behalf of ${
        chatBotDomain.name
      } and make them feel welcomed.

      Your next task is lead the conversation naturally to get the customer's email address. Be respectful and never break character.

      You will get an array of questions that you must ask the customer. 
      Progress the conversation using those questions. 
      Whenever you ask a question from the array, add a keyword at the end of the question (complete). This keyword is extremely important. Do not forget it.

      Only add this keyword when you're asking a question from the array of questions. No other question satisfies this condition.

      Always maintain character and stay respectful.

      The array of questions : [${chatBotDomain.filterQuestions
        .map((q) => q.question)
        .join(', ')}]

      If the customer says something out of context or inappropriate, simply say this is beyond you and you will get a (realtime) user to continue the conversation with a keyword (realtime) at the end of your reply.

      If the customer agrees to book an appointment, send them link http://localhost:3000/portal/${domainId}/appointment/${
      foundCustomerId ?? 'CUSTOMER_ID_NOT_FOUND'
    }
      If they want to buy a product, redirect them to http://localhost:3000/portal/${domainId}/payment/${
      foundCustomerId ?? 'CUSTOMER_ID_NOT_FOUND'
    }
    `.trim();

    // 6️⃣ Filter chat (remove leading 'assistant')
    const filteredChat = [...chat];
    while (filteredChat.length && filteredChat[0].role === 'assistant') {
      filteredChat.shift();
    }

    // If no messages or first is user => embed instructions
    if (!filteredChat.length) {
      filteredChat.push({
        role: 'user',
        content: instructions + '\n\n' + message,
      });
    } else if (filteredChat[0].role === 'user') {
      filteredChat[0].content =
        instructions + '\n\n' + filteredChat[0].content;
    } else {
      filteredChat.unshift({
        role: 'user',
        content: instructions + '\n\n' + message,
      });
    }

    // 7️⃣ Start Gemini Chat using the generative model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-pro-exp-02-05' });
    const chatSession = model.startChat({
      history: filteredChat.map((c) => ({
        role: c.role === 'user' ? 'user' : 'model',
        parts: [{ text: c.content }],
      })),
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.8,
        topP: 1,
      },
    });

    // 8️⃣ Send user's latest message
    const chatResponse = await chatSession.sendMessage(message);

    // 9️⃣ AI response
    const botResponse =
      chatResponse?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Please Wait for the reply....';

    // 10️⃣ If AI used (realtime)
    if (botResponse.includes('(realtime)')) {
      // Mark chat as live
      const updated = await client.chatRoom.update({
        where: { id: domainId }, // <-- again, this is referencing domainId. 
        data: { live: true },
      });
      if (updated) {
        // store the response minus (realtime)
        const finalResp = botResponse.replace('(realtime)', '').trim();
        await onStoreConversations(domainId, finalResp, 'assistant');
        return {
          response: {
            role: 'assistant',
            content: finalResp,
          },
        };
      }
    }

    // 11️⃣ If user's last message had (complete)
    if (chat.length && chat[chat.length - 1].content.includes('(complete)')) {
      const firstUnanswered = await client.customerResponses.findFirst({
        where: { answered: null },
        orderBy: { question: 'asc' },
      });
      if (firstUnanswered) {
        await client.customerResponses.update({
          where: { id: firstUnanswered.id },
          data: { answered: message },
        });
      }
    }

    // 12️⃣ Check for link in AI response
    const linkCheck = extractURLfromString(botResponse);
    if (linkCheck?.length) {
      const theLink = linkCheck[0];
      await onStoreConversations(
        domainId,
        `Great! you can follow the link to proceed: ${theLink}`,
        'assistant'
      );
      return {
        response: {
          role: 'assistant',
          content: `Great! you can follow the link to proceed: ${theLink}`,
        },
      };
    }

    // 13️⃣ Store final AI response in ChatRoom
    await onStoreConversations(domainId, botResponse, 'assistant');

    // 14️⃣ Return final AI response
    return { response: { role: 'assistant', content: botResponse } };
  } catch (error) {
    console.log(error);
    return {
      response: {
        role: 'assistant',
        content: "I'm having trouble responding. Please try again later.",
      },
    };
  }
};
