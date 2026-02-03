import { onCall, onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as v2 from "firebase-functions/v2";

// Padrão 1: Chamada direta
export const test1 = onCall((req) => {
  return { hello: "world" };
});

// Padrão 2: Com namespace
export const test2 = v2.https.onRequest((req, res) => {
  res.send("hello");
});

// Padrão 3: Firestore trigger
export const test3 = onDocumentCreated("users/{userId}", (event) => {
  console.log("User created");
});

// Padrão 4: Com opções (comum em produção)
const REGION = "southamerica-east1";
export const healthCheck = onRequest({ region: REGION }, (req, res) => {
  res.send("OK");
});

// Padrão 5: Com type parameters
export const test5 = onCall<{ data: string }>((req) => {
  return { message: req.data };
});
