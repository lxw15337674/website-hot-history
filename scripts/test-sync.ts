#!/usr/bin/env tsx

/**
 * 测试数据同步功能
 * 用于验证GitHub Actions工作流配置是否正确
 */

// 加载环境变量
import { config } from 'dotenv';
config();

import dayjs from 'dayjs';
import prisma from '../src/db/index';

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    // 测试数据库连接
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // 测试查询操作
    const count = await prisma.weiboHotHistory.count();
    console.log(`✅ Database query successful, total records: ${count}`);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function testEnvironmentVariables() {
  console.log('🔍 Testing environment variables...');
  
  const requiredVars = ['DATABASE_URL'];
  let allPresent = true;
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: configured`);
    } else {
      console.error(`❌ ${varName}: missing`);
      allPresent = false;
    }
  }
  
  return allPresent;
}

async function testAPIEndpoint() {
  console.log('🔍 Testing API endpoint...');
  
  try {
    const testDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/weibo-hot-history/${testDate}`;
    
    console.log(`📡 Testing API: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API response successful, data length: ${data.length || 0}`);
      return true;
    } else {
      console.error(`❌ API response failed: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ API test failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting sync configuration test...\n');
  
  const tests = [
    { name: 'Environment Variables', test: testEnvironmentVariables },
    { name: 'Database Connection', test: testDatabaseConnection },
    // 查询API测试需要服务器运行，在CI环境中可能不可用
    // { name: 'Query API Endpoint', test: testAPIEndpoint },
  ];
  
  let allPassed = true;
  
  for (const { name, test } of tests) {
    console.log(`\n--- Testing ${name} ---`);
    const result = await test();
    if (!result) {
      allPassed = false;
    }
  }
  
  console.log('\n📋 Test Summary:');
  if (allPassed) {
    console.log('🎉 All tests passed! GitHub Actions should work correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please check the configuration.');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}