const fs = require('fs');
const path = require('path');

// Simple test to verify the new document structure loads correctly
async function testDocumentLoading() {
  try {
    console.log('🧪 Testing document loading...');
    
    const filePath = path.join(__dirname, 'data', 'processed_consumer_rights_act.json');
    console.log('📂 Loading from:', filePath);
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const rawData = JSON.parse(fileContent);
    
    console.log('✅ File loaded successfully');
    console.log('📊 Root structure:');
    console.log(`   - ID: ${rawData.id}`);
    console.log(`   - Title: ${rawData.title}`);
    console.log(`   - Level: ${rawData.level}`);
    console.log(`   - Has children: ${!!rawData.children}`);
    console.log(`   - Children count: ${rawData.children ? Object.keys(rawData.children).length : 0}`);
    
    if (rawData.children) {
      console.log('📋 First few children:');
      Object.keys(rawData.children).slice(0, 3).forEach(key => {
        const child = rawData.children[key];
        console.log(`   - ${key}: "${child.title}" (Level ${child.level})`);
      });
    }
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDocumentLoading(); 