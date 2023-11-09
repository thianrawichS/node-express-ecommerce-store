# node-express-ecommerce-store

## Prerequisites

- Docker installed
- Docker Compose installed
- .env file with the specified content

## Getting Started

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/thianrawichS/node-express-ecommerce-store.git

2. **Environment Variables:**
   - Create a `.env` file in the project directory with the following content:
   ```env
   # DB_INFO
   DB_HOST="mysql"
   USER="your-mysql-user"
   PASSWORD="your-mysql-password"
   ROOT_PASSWORD="your-mysql-root-password"
   DB="your-mysql-database"
   
   # JWT KEY
   SECRET_KEY="your-secret-key"
   
   # SESSION SECRET
   SESSION_SECRET="your-session-secret"

3. **Run the App:**
   ```bash
   docker-compose up
