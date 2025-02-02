import { declare } from "@babel/helper-plugin-utils";
import syntaxOptionalChaining from "@babel/plugin-syntax-optional-chaining";
import { types as t } from "@babel/core";

export default declare((api, options) => {
  api.assertVersion(7);

  const { loose = false } = options;

  function isSimpleMemberExpression(expression) {
    return (
      t.isIdentifier(expression) ||
      t.isSuper(expression) ||
      (t.isMemberExpression(expression) &&
        !expression.computed &&
        isSimpleMemberExpression(expression.object))
    );
  }

  return {
    name: "proposal-optional-chaining",
    inherits: syntaxOptionalChaining,

    visitor: {
      "OptionalCallExpression|OptionalMemberExpression"(path) {
        const { scope } = path;
        // maybeParenthesized points to the outermost parenthesizedExpression
        // or the path itself
        let maybeParenthesized = path;
        const parentPath = path.findParent(p => {
          if (!p.isParenthesizedExpression()) return true;
          maybeParenthesized = p;
        });
        let isDeleteOperation = false;
        const parentIsCall =
          parentPath.isCallExpression({ callee: maybeParenthesized.node }) &&
          // note that the first condition must implies that `path.optional` is `true`,
          // otherwise the parentPath should be an OptionalCallExpressioin
          path.isOptionalMemberExpression();

        const optionals = [];

        let optionalPath = path;
        while (
          optionalPath.isOptionalMemberExpression() ||
          optionalPath.isOptionalCallExpression() ||
          optionalPath.isParenthesizedExpression() ||
          optionalPath.isTSNonNullExpression()
        ) {
          const { node } = optionalPath;
          if (node.optional) {
            optionals.push(node);
          }

          if (optionalPath.isOptionalMemberExpression()) {
            optionalPath.node.type = "MemberExpression";
            optionalPath = optionalPath.get("object");
          } else if (optionalPath.isOptionalCallExpression()) {
            optionalPath.node.type = "CallExpression";
            optionalPath = optionalPath.get("callee");
          } else {
            // unwrap TSNonNullExpression/ParenthesizedExpression if needed
            optionalPath = optionalPath.get("expression");
          }
        }

        let replacementPath = path;
        if (parentPath.isUnaryExpression({ operator: "delete" })) {
          replacementPath = parentPath;
          isDeleteOperation = true;
        }
        for (let i = optionals.length - 1; i >= 0; i--) {
          const node = optionals[i];

          const isCall = t.isCallExpression(node);
          const replaceKey = isCall ? "callee" : "object";
          const chain = node[replaceKey];

          let ref;
          let check;
          if (loose && isCall && isSimpleMemberExpression(chain)) {
            // If we are using a loose transform (avoiding a Function#call) and we are at the call,
            // we can avoid a needless memoize. We only do this if the callee is a simple member
            // expression, to avoid multiple calls to nested call expressions.
            check = ref = chain;
          } else {
            ref = scope.maybeGenerateMemoised(chain);
            if (ref) {
              check = t.assignmentExpression(
                "=",
                t.cloneNode(ref),
                // Here `chain` MUST NOT be cloned because it could be updated
                // when generating the memoised context of a call espression
                chain,
              );
              node[replaceKey] = ref;
            } else {
              check = ref = chain;
            }
          }

          // Ensure call expressions have the proper `this`
          // `foo.bar()` has context `foo`.
          if (isCall && t.isMemberExpression(chain)) {
            if (loose && isSimpleMemberExpression(chain)) {
              // To avoid a Function#call, we can instead re-grab the property from the context object.
              // `a.?b.?()` translates roughly to `_a.b != null && _a.b()`
              node.callee = chain;
            } else {
              // Otherwise, we need to memoize the context object, and change the call into a Function#call.
              // `a.?b.?()` translates roughly to `(_b = _a.b) != null && _b.call(_a)`
              const { object } = chain;
              let context = scope.maybeGenerateMemoised(object);
              if (context) {
                chain.object = t.assignmentExpression("=", context, object);
              } else if (t.isSuper(object)) {
                context = t.thisExpression();
              } else {
                context = object;
              }

              node.arguments.unshift(t.cloneNode(context));
              node.callee = t.memberExpression(
                node.callee,
                t.identifier("call"),
              );
            }
          }
          let replacement = replacementPath.node;
          // Ensure (a?.b)() has proper `this`
          // The `parentIsCall` is constant within loop, we should check i === 0
          // to ensure that it is only applied to the first optional chain element
          // i.e. `?.b` in `(a?.b.c)()`
          if (i === 0 && parentIsCall) {
            // `(a?.b)()` to `(a == null ? undefined : a.b.bind(a))()`
            const { object } = replacement;
            let baseRef;
            if (!loose || !isSimpleMemberExpression(object)) {
              // memoize the context object in non-loose mode
              // `(a?.b.c)()` to `(a == null ? undefined : (_a$b = a.b).c.bind(_a$b))()`
              baseRef = scope.maybeGenerateMemoised(object);
              if (baseRef) {
                replacement.object = t.assignmentExpression(
                  "=",
                  baseRef,
                  object,
                );
              }
            }
            replacement = t.callExpression(
              t.memberExpression(replacement, t.identifier("bind")),
              [t.cloneNode(baseRef ?? object)],
            );
          }
          replacementPath.replaceWith(
            t.conditionalExpression(
              loose
                ? t.binaryExpression("==", t.cloneNode(check), t.nullLiteral())
                : t.logicalExpression(
                    "||",
                    t.binaryExpression(
                      "===",
                      t.cloneNode(check),
                      t.nullLiteral(),
                    ),
                    t.binaryExpression(
                      "===",
                      t.cloneNode(ref),
                      scope.buildUndefinedNode(),
                    ),
                  ),
              isDeleteOperation
                ? t.booleanLiteral(true)
                : scope.buildUndefinedNode(),
              replacement,
            ),
            "proposal-optional-chaining",
          );

          replacementPath = replacementPath.get("alternate");
        }
      },
    },
  };
});
