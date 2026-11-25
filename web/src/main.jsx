import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ApolloClient, ApolloProvider, HttpLink, InMemoryCache, from } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { Observable } from "@apollo/client/utilities";
import App from "./App.jsx";
import "./index.css";
import { freshAccessToken, refreshSession } from "./auth";

const authLink = setContext(async (_, previousContext) => {
  const token = await freshAccessToken();
  return token
    ? { ...previousContext, headers: { ...previousContext.headers, authorization: `Bearer ${token}` } }
    : previousContext;
});
const refreshLink = onError(({ graphQLErrors, operation, forward }) => {
  const unauthenticated = graphQLErrors?.some((error) => error.extensions?.code === "UNAUTHENTICATED");
  if (!unauthenticated || operation.getContext().authRetry) return;
  return new Observable((observer) => {
    refreshSession().then((token) => {
      if (!token) {
        window.location.assign("/account");
        observer.complete();
        return;
      }
      operation.setContext(({ headers = {} }) => ({
        authRetry: true,
        headers: { ...headers, authorization: `Bearer ${token}` },
      }));
      forward(operation).subscribe(observer);
    }).catch((error) => observer.error(error));
  });
});
const httpLink = new HttpLink({ uri: "/graphql" });
const client = new ApolloClient({
  link: from([refreshLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});

createRoot(document.getElementById("root")).render(
  <ApolloProvider client={client}>
    <BrowserRouter><App /></BrowserRouter>
  </ApolloProvider>,
);
