require('dotenv').config();
const mongoose = require('mongoose');
const { SysNodeDefinitions } = require('../src/db/schemas');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/WatchManagerV2';

const seedNodes = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // Clear existing
    await SysNodeDefinitions.deleteMany({});
    console.log('Cleared existing node definitions.');

    const nodes = [
      {
        type: 'trigger_webhook',
        label: 'Entry Trigger',
        icon_emoji: '⚡',
        palette_badge_class: 'trigger-badge',
        default_config: { keyword: '', catch_all: false }
      },
      {
        type: 'trigger_menu',
        label: 'Menu Trigger',
        icon_emoji: '⚡',
        palette_badge_class: 'trigger-badge',
        default_config: { mapped_option: '' }
      },
      {
        type: 'prompt_text',
        label: 'Prompt Text',
        icon_emoji: '💬',
        palette_badge_class: 'text-badge',
        default_config: { message: '', input_variable: '', await_response: false, fallback_template_name: '', fallback_template_params: [] }
      },
      {
        type: 'prompt_buttons',
        label: 'Prompt Buttons',
        icon_emoji: '🔘',
        palette_badge_class: 'buttons-badge',
        default_config: {
          message: '',
          input_variable: '',
          single_output: false,
          hidden_keywords: '',
          buttons: [{ id: 'opt_1', title: 'Option 1' }],
          fallback_template_name: '',
          fallback_template_params: []
        }
      },
      {
        type: 'prompt_list',
        label: 'Prompt List',
        icon_emoji: '📋',
        palette_badge_class: 'list-badge',
        default_config: {
          title: 'Main Menu',
          button_text: 'View Options',
          description: '',
          input_variable: '',
          single_output: false,
          hidden_keywords: '',
          sections: [
            {
              title: 'Options',
              rows: [
                { id: 'row_1', title: 'Option 1', description: '' }
              ]
            }
          ],
          fallback_template_name: '',
          fallback_template_params: []
        }
      },
      {
        type: 'action_http',
        label: 'Outbound API',
        icon_emoji: '🌐',
        palette_badge_class: 'http-badge',
        default_config: { method: 'POST', url: '', headers: {}, body: {} }
      },
      {
        type: 'action_db',
        label: 'Database Ops',
        icon_emoji: '🗄️',
        palette_badge_class: 'db-badge',
        default_config: { collection: '', operation: 'find', query: {}, data: {} }
      },
      {
        type: 'condition_split',
        label: 'Condition Split',
        icon_emoji: '🔀',
        palette_badge_class: 'condition-badge',
        default_config: { variable: '', operator: 'equals', value: '' }
      },
      {
        type: 'action_jump',
        label: 'Jump to Blueprint',
        icon_emoji: '↪️',
        palette_badge_class: 'action-badge',
        default_config: { target_journey_id: '' }
      }
    ];

    await SysNodeDefinitions.insertMany(nodes);
    console.log(`Successfully seeded ${nodes.length} node definitions.`);

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

seedNodes();
