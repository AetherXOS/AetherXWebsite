/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
    theme: {
        extend: {
            fontFamily: {
                mono: ["JetBrains Mono", "ui-monospace", "monospace"],
                sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius))",
                sm: "calc(var(--radius))",
            },
            colors: {
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                cyan: {
                    DEFAULT: "#00E5FF",
                    50: "#E0FBFF",
                    100: "#B8F4FF",
                    200: "#7AECFF",
                    300: "#3DE3FF",
                    400: "#00E5FF",
                    500: "#00C8E0",
                    600: "#0099AB",
                    700: "#006B78",
                    800: "#003D44",
                    900: "#001F22",
                },
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
