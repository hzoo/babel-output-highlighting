import React from "react";
import ReactDOM from "react-dom";
import { App } from "./components/App";

const SOURCE = `class A {
  a() {
    a?.[1_0_0_0_0];
  }
}`;
const CONFIG = [
  {
    presets: [
      [
        "@babel/preset-env",
        { loose: true, modules: false, shippedProposals: true },
      ],
    ],
  },
];
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
