import { useEffect } from "react";
import api from "./lib/api.js";

function App() {
  useEffect(() => {
    api
      .get("/user/test")
      .then((response) => {
        console.log(response);
      })
      .catch((error) => {
        console.error("API request failed:", error);
      });
  }, []);

  return <h1>PRECISE BET FRONT END</h1>;
}

export default App;
