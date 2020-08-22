import React from "react";
import ReactDOM from "react-dom";
import { App } from "./components/App";

const SOURCE = `var z = [...f];
let d = {
  f() {},
  x
};
const foo = async (...a) => \`\${a}\`;
async function a() {};
<a></a>;
class A {
  a() {
    for (b of []) {
      \`a\${c?.[1_0_0_0_0]}\`;
	  }
  }
}`;
const CONFIG = [
  {
    presets: [
      [
        "@babel/preset-env",
        { loose: true, modules: false, shippedProposals: true },
      ],
      "@babel/preset-react",
    ],
    plugins: [
      [
        require("@babel/plugin-transform-runtime"),
        {
          useESModules: true,
          // helpers: false,
          version: "7.100.0",
        },
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
