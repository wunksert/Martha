import prisma from '../prisma.js';
import { logToolCall } from '../lib/helpers.js';

export async function deleteAllTodos(){
    await prisma.toDo.deleteMany();
    return({
        content: [{type: "text", text: "All todos successfully deleted."}],
        structuredContent: { tasks: []}
    })
}

export async function addTodoHandler(args: {title: string}, {_meta}: any){
    const locale = _meta?.["openai/locale"] ?? "not-provided";
    const location = _meta?.["openai/userLocation"];
    const userAgent = _meta?.["openai/userAgent"];
    const subject = _meta?.["openai/subject"]; //anonymized userID used for rate limiting and identification. Sounds global
    
    console.log("metadata:", {
        meta: {
            locale,
            location,
            userAgent,
            subject
        }
    });

    const title = args?.title?.trim() ?? "";

    const todos = await prisma.toDo.findMany({
        orderBy: { createdAt: 'desc' }
    });


    if (!title){
        return ({
            content: [{ type: "text", text: "Missing Title!" }],
            structuredContent: { tasks: todos },
          })
    }

    // Add a new todo with the given title
    const todo = await prisma.toDo.create({
        data: {
            title: title,
        }
    });

    const newTodos = [...todos, todo]
    

    return ({
        content: [{ type: "text", text: `Todo Added: ${title}` }],
        structuredContent: { tasks: newTodos },
      })
}