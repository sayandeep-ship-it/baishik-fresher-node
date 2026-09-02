'use strict';

const crypto = require('crypto');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'loyalty_programs';

    let table = await queryInterface.describeTable(tableName);

    // =====================================================
    // 1. ADD QR CODE TOKEN
    // =====================================================

    if (!table.qr_code_token) {
      await queryInterface.addColumn(
        tableName,
        'qr_code_token',
        {
          type: Sequelize.STRING(128),
          allowNull: true,
        }
      );
    }

    // =====================================================
    // 2. ADD PIN FLAG
    // =====================================================

    table = await queryInterface.describeTable(
      tableName
    );

    if (!table.has_pin) {
      await queryInterface.addColumn(
        tableName,
        'has_pin',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        }
      );
    }

    // =====================================================
    // 3. GENERATE QR TOKENS FOR EXISTING ROWS
    // =====================================================

    const [programs] =
      await queryInterface.sequelize.query(
        `
          SELECT id, qr_code_token
          FROM ${tableName}
        `
      );

    for (const program of programs) {
      if (program.qr_code_token) {
        continue;
      }

      const qrCodeToken =
        crypto
          .randomBytes(32)
          .toString('hex');

      await queryInterface.sequelize.query(
        `
          UPDATE ${tableName}
          SET qr_code_token = :qrCodeToken
          WHERE id = :id
        `,
        {
          replacements: {
            qrCodeToken,
            id: program.id,
          },
        }
      );
    }

    // =====================================================
    // 4. MAKE QR TOKEN REQUIRED
    // =====================================================

    table = await queryInterface.describeTable(
      tableName
    );

    await queryInterface.changeColumn(
      tableName,
      'qr_code_token',
      {
        type: Sequelize.STRING(128),
        allowNull: false,
      }
    );

    // =====================================================
    // 5. UNIQUE QR TOKEN
    // =====================================================

    const indexes =
      await queryInterface.showIndex(
        tableName
      );

    if (
      !indexes.some(
        (index) =>
          index.name ===
          'loyalty_programs_qr_code_token_unique'
      )
    ) {
      await queryInterface.addIndex(
        tableName,
        ['qr_code_token'],
        {
          unique: true,
          name:
            'loyalty_programs_qr_code_token_unique',
        }
      );
    }

    // =====================================================
    // 6. CREATE LOYALTY PROGRAM PINS TABLE
    // =====================================================

    const tables =
      await queryInterface.showAllTables();

    const normalizedTables =
      tables.map((value) =>
        typeof value === 'object'
          ? value.tableName || value
          : value
      );

    if (
      !normalizedTables.includes(
        'loyalty_program_pins'
      )
    ) {
      await queryInterface.createTable(
        'loyalty_program_pins',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },

          loyalty_program_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'loyalty_programs',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },

          vendor_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },

          pin_hash: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },

          expires_at: {
            type: Sequelize.DATE,
            allowNull: false,
          },

          used_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },

          revoked_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },

          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
          },

          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
          },
        }
      );

      await queryInterface.addIndex(
        'loyalty_program_pins',
        ['loyalty_program_id'],
        {
          name:
            'loyalty_program_pins_program_index',
        }
      );

      await queryInterface.addIndex(
        'loyalty_program_pins',
        ['vendor_id'],
        {
          name:
            'loyalty_program_pins_vendor_index',
        }
      );

      await queryInterface.addIndex(
        'loyalty_program_pins',
        ['expires_at'],
        {
          name:
            'loyalty_program_pins_expiry_index',
        }
      );
    }

    // =====================================================
    // 7. CREATE LOYALTY SCANS TABLE
    // =====================================================

    if (
      !normalizedTables.includes(
        'loyalty_scans'
      )
    ) {
      await queryInterface.createTable(
        'loyalty_scans',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },

          user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },

          loyalty_program_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'loyalty_programs',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },

          status: {
            type: Sequelize.ENUM(
              'PENDING_PIN',
              'AWARDED',
              'EXPIRED'
            ),
            allowNull: false,
            defaultValue: 'AWARDED',
          },

          stars_awarded: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },

          pin_verified: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },

          scanned_at: {
            type: Sequelize.DATE,
            allowNull: false,
          },

          verified_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },

          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
          },

          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
          },
        }
      );

      await queryInterface.addIndex(
        'loyalty_scans',
        [
          'user_id',
          'loyalty_program_id',
          'scanned_at',
        ],
        {
          name:
            'loyalty_scans_user_program_time_index',
        }
      );

      await queryInterface.addIndex(
        'loyalty_scans',
        ['status'],
        {
          name:
            'loyalty_scans_status_index',
        }
      );
    }
  },

  async down(queryInterface) {
    const tables =
      await queryInterface.showAllTables();

    const normalizedTables =
      tables.map((value) =>
        typeof value === 'object'
          ? value.tableName || value
          : value
      );

    // =====================================================
    // 1. DROP LOYALTY SCANS
    // =====================================================

    if (
      normalizedTables.includes(
        'loyalty_scans'
      )
    ) {
      await queryInterface.dropTable(
        'loyalty_scans'
      );
    }

    // =====================================================
    // 2. DROP LOYALTY PROGRAM PINS
    // =====================================================

    if (
      normalizedTables.includes(
        'loyalty_program_pins'
      )
    ) {
      await queryInterface.dropTable(
        'loyalty_program_pins'
      );
    }

    // =====================================================
    // 3. REMOVE QR TOKEN UNIQUE INDEX
    // =====================================================

    const tableName =
      'loyalty_programs';

    const indexes =
      await queryInterface.showIndex(
        tableName
      );

    if (
      indexes.some(
        (index) =>
          index.name ===
          'loyalty_programs_qr_code_token_unique'
      )
    ) {
      await queryInterface.removeIndex(
        tableName,
        'loyalty_programs_qr_code_token_unique'
      );
    }

    // =====================================================
    // 4. REMOVE HAS PIN
    // =====================================================

    const table =
      await queryInterface.describeTable(
        tableName
      );

    if (table.has_pin) {
      await queryInterface.removeColumn(
        tableName,
        'has_pin'
      );
    }

    // =====================================================
    // 5. REMOVE QR TOKEN
    // =====================================================

    if (table.qr_code_token) {
      await queryInterface.removeColumn(
        tableName,
        'qr_code_token'
      );
    }

   
  },
};