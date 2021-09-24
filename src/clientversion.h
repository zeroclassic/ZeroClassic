// Copyright (c) 2009-2014 The Bitcoin Core developers
// Copyright (c) 2016-2021 The Zcash developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or https://www.opensource.org/licenses/mit-license.php .

#ifndef BITCOIN_CLIENTVERSION_H
#define BITCOIN_CLIENTVERSION_H

#if defined(HAVE_CONFIG_H)
#include "config/bitcoin-config.h"
#else

/**
 * client versioning and copyright year
 */

//! These need to be macros, as clientversion.cpp's and bitcoin*-res.rc's voodoo requires it
#define CLIENT_VERSION_MAJOR 4
#define CLIENT_VERSION_MINOR 4
#define CLIENT_VERSION_REVISION 2
#define CLIENT_VERSION_BUILD 50

//! Set to true for release, false for prerelease or test build
#define CLIENT_VERSION_IS_RELEASE true

/**
 * Copyright year (2009-this)
 * Todo: update this when changing our copyright comments in the source
 */
#define COPYRIGHT_YEAR 2021

#endif //HAVE_CONFIG_H

/**
 * Converts the parameter X to a string after macro replacement on X has been performed.
 * Don't merge these into one macro!
 */
#define STRINGIZE(X) DO_STRINGIZE(X)
#define DO_STRINGIZE(X) #X

//! Copyright string used in Windows .rc files
#define COPYRIGHT_STR "2009-" STRINGIZE(COPYRIGHT_YEAR) " The Bitcoin Core Developers, The Zcash developers and The ZeroClassic developers"

/**
 * Additional macros, to ease the pain of (fork | rebase) rebranding
 */
#define RC_COIN_NAME "ZeroClassic"
#define RC_COIN_NAME_LOWERCASE "zeroclassic"
#define RC_COIN_NICKNAME "zero"
#define RC_COIN_CLIENT_NAME "Yozakura"
#define RC_COIN_DAEMON_EXECUTABLE "zerod"
#define RC_COIN_CLI_EXECUTABLE "zero-cli"
#define RC_COIN_TX_EXECUTABLE "zero-tx" 
#define RC_COIN_WALLET_FILENAME "wallet.zero"
#define RC_COIN_RPC_PORT_MAINNET 23901
#define RC_COIN_RPC_PORT_TESTNET 23902
#define RC_COIN_RPC_PORT_REGTEST 23903
#define RC_COIN_CURRENCY_UNIT "ZERC"
#define RC_COIN_MINOR_CURRENCY_UNIT "zeroshis"
#define RC_APPROX_RELEASE_HEIGHT 1200000
#define RC_MAX_OUTBOUND_CONNECTIONS 16


/**
 * bitcoind-res.rc includes this file, but it cannot cope with real c++ code.
 * WINDRES_PREPROC is defined to indicate that its pre-processor is running.
 * Anything other than a define should be guarded below.
 */

#if !defined(WINDRES_PREPROC)

#include <string>
#include <vector>

static const int CLIENT_VERSION =
                           1000000 * CLIENT_VERSION_MAJOR
                         +   10000 * CLIENT_VERSION_MINOR
                         +     100 * CLIENT_VERSION_REVISION
                         +       1 * CLIENT_VERSION_BUILD;

extern const std::string CLIENT_NAME;
extern const std::string CLIENT_BUILD;
extern const std::string CLIENT_DATE;


std::string FormatVersion(int nVersion);
std::string FormatFullVersion();
std::string FormatSubVersion(const std::string& name, int nClientVersion, const std::vector<std::string>& comments);

/**
 * Additional defined macros converted to const strings
 */
const std::string COIN_NAME(RC_COIN_NAME);
const std::string COIN_NAME_LOWERCASE(RC_COIN_NAME_LOWERCASE);
const std::string COIN_NICKNAME(RC_COIN_NICKNAME);
const std::string COIN_DAEMON_EXECUTABLE(RC_COIN_DAEMON_EXECUTABLE);
const std::string COIN_CLI_EXECUTABLE(RC_COIN_CLI_EXECUTABLE);
const std::string COIN_TX_EXECUTABLE(RC_COIN_TX_EXECUTABLE);
const std::string COIN_PID_FILENAME(RC_COIN_DAEMON_EXECUTABLE + std::string(".pid"));
const std::string COIN_CONF_FILENAME(RC_COIN_NICKNAME + std::string(".conf"));


#endif // WINDRES_PREPROC

#endif // BITCOIN_CLIENTVERSION_H
