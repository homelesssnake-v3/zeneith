import express from "express";
import { PrismaClient } from "@repo/prisma/client";
import { paymentinfoschema } from "@repo/zod";

const prisma = new PrismaClient();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.post("/", async (req, res) => {
    console.log(req.body);
    const check = paymentinfoschema.safeParse(req.body);
    if (!check.success) {
        return res.status(400).json({ error: "Invalid request body" });
    }
   
    const paymentinfo={
        token: req.body.token,
        amount: req.body.amount,
        userNumber: String(req.body.user_number),
        
    }
    

  const transaction = await prisma.onRampTransaction.findUnique({
    where:{
        token: paymentinfo.token
    }
})


    if(transaction?.status === "Success"){
        return res.status(200).json({message:"already processed"});
    }

    try{

      
        await prisma.$transaction([
         prisma.balance.update({
                where:{
                    userNumber: paymentinfo.userNumber 
                },
                data:{
                    amount: {
                        increment: paymentinfo.amount
                    }
                   
                }
            }),
            prisma.onRampTransaction.update({
                where:{
                    token: paymentinfo.token
                },
                data:{
                
                    status: "Success"
                    
                }
            })
            
        ])
        res.status(200).json({message:"success"});
        
    }catch(error){
        console.log(error);

        try{
            await prisma.onRampTransaction.update({
                where:{
                    token: paymentinfo.token
                },
                data:{
                    status: "Failure"
                    
                }
            })
        }catch(error){
            res.status(400).json({error:"error" +"(transaction updation failed )"});
        }

        res.status(400).json({error:"error" +"(couldnt process the transaction)"});
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
