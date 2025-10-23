// Custom Tailwind plugin for scrollbar styling
const plugin = require("tailwindcss/plugin");

module.exports = plugin(function ({ addUtilities, theme }) {
  const scrollbarUtilities = {
    ".scrollbar-thin": {
      "scrollbar-width": "thin",
      "scrollbar-color": `${theme("colors.gray.600")} ${theme(
        "colors.gray.800"
      )}`,
    },
    ".scrollbar-webkit": {
      "&::-webkit-scrollbar": {
        width: "8px",
        height: "8px",
      },
      "&::-webkit-scrollbar-track": {
        background: theme("colors.gray.800"),
        borderRadius: "4px",
      },
      "&::-webkit-scrollbar-thumb": {
        background: `linear-gradient(to bottom, ${theme(
          "colors.gray.500"
        )}, ${theme("colors.gray.600")})`,
        borderRadius: "4px",
        border: `1px solid ${theme("colors.gray.700")}`,
      },
      "&::-webkit-scrollbar-thumb:hover": {
        background: `linear-gradient(to bottom, ${theme(
          "colors.gray.400"
        )}, ${theme("colors.gray.500")})`,
      },
    },
    ".scrollbar-purple": {
      "scrollbar-color": `${theme("colors.purple.500")} ${theme(
        "colors.gray.800"
      )}`,
      "&::-webkit-scrollbar-thumb": {
        background: `linear-gradient(to bottom, ${theme(
          "colors.purple.500"
        )}, ${theme("colors.purple.600")})`,
      },
      "&::-webkit-scrollbar-thumb:hover": {
        background: `linear-gradient(to bottom, ${theme(
          "colors.purple.400"
        )}, ${theme("colors.purple.500")})`,
      },
    },
  };

  addUtilities(scrollbarUtilities);
});
