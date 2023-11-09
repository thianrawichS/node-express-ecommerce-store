# node-express-ecommerce-store

## Prerequisites

- Docker installed
- Docker Compose installed
- .env file with the specified content

## Getting Started

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/thianrawichS/node-express-ecommerce-store.git
   cd <your-project-folder>

2. **Environment Variables:**
   - Create a `.env` file in the project directory with the following content: ```(Change USER, PASSWORD, and ROOT_PASSWORD)```
   ```env
   # DB_INFO
   DB_HOST="mysql"
   USER=<your_mysql_user>
   PASSWORD=<your_mysql_password>
   ROOT_PASSWORD=<your_mysql_root_password>
   DB="db_store"
   
   # JWT KEY
   SECRET_KEY="your-secret-key"
   
   # SESSION SECRET
   SESSION_SECRET="your-session-secret"

3. **Run the App:**
   ```bash
   docker-compose up
