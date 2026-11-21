import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ApolloClient, ApolloProvider, HttpLink, InMemoryCache } from "@apollo/client";
import App from "./App.jsx";
import "./index.css";

// Dev only: act as a test user (needs ALLOW_DEV_AUTH=true in .dev.vars of the API).
const headers = import.meta.env.DEV ? { "x-sparrow-user": "dev" } : {};
const client = new ApolloClient({
  link: new HttpLink({ uri: "/graphql", headers }),
  cache: new InMemoryCache(),
});

createRoot(document.getElementById("root")).render(
  <ApolloProvider client={client}>
    <BrowserRouter><App /></BrowserRouter>
  </ApolloProvider>,
);
