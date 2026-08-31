'use strict';

const crypto = require('crypto');
const QRCode = require('qrcode');

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'loyalty_programs';
    let table = await queryInterface.describeTable(tableName);

    // -------------------------------------------------
    // Add QR columns as nullable first so an existing
    // production/development database can be migrated
    // without failing on rows that already exist.
    // -------------------------------------------------

    if (!table.qr_code_token) {
      await queryInterface.addColumn(tableName, 'qr_code_token', {
        type: Sequelize.STRING(128),
        allowNull: true,
      });
    }

    if (!table.qr_code_image) {
      await queryInterface.addColumn(tableName, 'qr_code_image', {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      });
    }

    if (!table.has_pin) {
      await queryInterface.addColumn(tableName, 'has_pin', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    // -------------------------------------------------
    // Backfill QR data for existing loyalty programs.
    // This guarantees every existing program also gets
    // a usable QR code.
    // -------------------------------------------------

    const [programs] = await queryInterface.sequelize.query(
      `SELECT id, qr_code_token, qr_code_image FROM ${tableName}`
    );

    for (const program of programs) {
      if (program.qr_code_token && program.qr_code_image) {
        continue;
      }

      const qrCodeToken = program.qr_code_token || crypto.randomBytes(32).toString('hex');
      const qrPayload = JSON.stringify({
        type: 'LOYALTY_PROGRAM',
        token: qrCodeToken,
      });

      const qrCodeImage = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: 'M',
        width: 320,
        margin: 2,
      });

      await queryInterface.sequelize.query(
        `UPDATE ${tableName} SET qr_code_token = :qrCodeToken, qr_code_image = :qrCodeImage WHERE id = :id`,
        {
          replacements: {
            qrCodeToken,
            qrCodeImage,
            id: program.id,
          },
        }
      );
    }

    // -------------------------------------------------
    // Make QR fields mandatory after backfill.
    // -------------------------------------------------

    table = await queryInterface.describeTable(tableName);

    await queryInterface.changeColumn(tableName, 'qr_code_token', {
      type: Sequelize.STRING(128),
      allowNull: false,
    });

    await queryInterface.changeColumn(tableName, 'qr_code_image', {
      type: Sequelize.TEXT('long'),
      allowNull: false,
    });

    // -------------------------------------------------
    // Unique QR token index
    // -------------------------------------------------

    const indexes = await queryInterface.showIndex(tableName);

    if (!indexes.some((index) => index.name === 'loyalty_programs_qr_code_token_unique')) {
      await queryInterface.addIndex(tableName, ['qr_code_token'], {
        unique: true,
        name: 'loyalty_programs_qr_code_token_unique',
      });
    }

    // -------------------------------------------------
    // PIN table
    // -------------------------------------------------

    const tables = await queryInterface.showAllTables();
    const normalizedTables = tables.map((value) =>
      typeof value === 'object' ? value.tableName || value : value
    );

    if (!normalizedTables.includes('loyalty_program_pins')) {
      await queryInterface.createTable('loyalty_program_pins', {
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
      });

      await queryInterface.addIndex('loyalty_program_pins', ['loyalty_program_id'], {
        name: 'loyalty_program_pins_program_index',
      });

      await queryInterface.addIndex('loyalty_program_pins', ['vendor_id'], {
        name: 'loyalty_program_pins_vendor_index',
      });

      await queryInterface.addIndex('loyalty_program_pins', ['expires_at'], {
        name: 'loyalty_program_pins_expiry_index',
      });
    }

    // -------------------------------------------------
    // Scan table
    // -------------------------------------------------

    if (!normalizedTables.includes('loyalty_scans')) {
      await queryInterface.createTable('loyalty_scans', {
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
          type: Sequelize.ENUM('PENDING_PIN', 'AWARDED', 'EXPIRED'),
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
      });

      await queryInterface.addIndex(
        'loyalty_scans',
        ['user_id', 'loyalty_program_id', 'scanned_at'],
        {
          name: 'loyalty_scans_user_program_time_index',
        }
      );

      await queryInterface.addIndex('loyalty_scans', ['status'], {
        name: 'loyalty_scans_status_index',
      });
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const normalizedTables = tables.map((value) =>
      typeof value === 'object' ? value.tableName || value : value
    );

    if (normalizedTables.includes('loyalty_scans')) {
      await queryInterface.dropTable('loyalty_scans');
    }

    if (normalizedTables.includes('loyalty_program_pins')) {
      await queryInterface.dropTable('loyalty_program_pins');
    }

    const tableName = 'loyalty_programs';
    const table = await queryInterface.describeTable(tableName);
    const indexes = await queryInterface.showIndex(tableName);

    if (indexes.some((index) => index.name === 'loyalty_programs_qr_code_token_unique')) {
      await queryInterface.removeIndex(tableName, 'loyalty_programs_qr_code_token_unique');
    }

    if (table.has_pin) {
      await queryInterface.removeColumn(tableName, 'has_pin');
    }

    if (table.qr_code_image) {
      await queryInterface.removeColumn(tableName, 'qr_code_image');
    }

    if (table.qr_code_token) {
      await queryInterface.removeColumn(tableName, 'qr_code_token');
    }
  },
};
