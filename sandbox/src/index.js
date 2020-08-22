import React from "react";
import ReactDOM from "react-dom";
import { App } from "./components/App";

const SOURCE = `class A {}`;
const CONFIG = [{}];
const PLUGIN = `export default function customPlugin(babel) {
  return {
    visitor: {
      Identifier(path) {
        // console.log(path.node.name);
      }
    }
  };
}
`;

ReactDOM.render(
  <React.StrictMode>
    <App
      defaultBabelConfig={CONFIG}
      defaultSource={SOURCE}
      defCustomPlugin={PLUGIN}
    />
  </React.StrictMode>,
  document.getElementById("root")
);
