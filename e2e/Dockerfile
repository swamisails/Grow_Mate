# Playwright runner for the e2e stack; the official image matches @playwright/test 1.64.1.
FROM mcr.microsoft.com/playwright:v1.64.1-noble
WORKDIR /e2e
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
CMD ["npx", "playwright", "test"]
