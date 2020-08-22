import { declare } from "@babel/helper-plugin-utils";
import syntaxNumericSeparator from "@babel/plugin-syntax-numeric-separator";

function addExtra(node, name) {
  node.extra = node.extra || {};
  node.extra.sourcePlugin = name;
}

export default declare(api => {
  api.assertVersion(7);

  return {
    name: "proposal-numeric-separator",
    inherits: syntaxNumericSeparator,

    visitor: {
      NumericLiteral({ node }) {
        const { extra } = node;
        if (extra && /_/.test(extra.raw)) {
          addExtra(node, "transform-numeric-separator");
          extra.raw = extra.raw.replace(/_/g, "");
        }
      },
    },
  };
});
