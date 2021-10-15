# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.2.8](https://github.com/ecomplus/app-wirecard/compare/v2.2.7...v2.2.8) (2021-10-15)

### [2.2.7](https://github.com/ecomplus/app-wirecard/compare/v2.2.6...v2.2.7) (2021-10-15)


### Bug Fixes

* **transaction-updater:** try to match more orders without overloading ([90785cb](https://github.com/ecomplus/app-wirecard/commit/90785cb61fba3d389804b2d62f19b11a3c1b4f98))

### [2.2.6](https://github.com/ecomplus/app-wirecard/compare/v2.2.5...v2.2.6) (2021-09-27)


### Bug Fixes

* **transactions-updater:** revert temp fixes, list orders up to 4 days only ([4e7c45c](https://github.com/ecomplus/app-wirecard/commit/4e7c45c06af076c39e5a846391a7463838713f14))

### [2.2.5](https://github.com/ecomclub/app-wirecard/compare/v2.2.4...v2.2.5) (2021-09-27)


### Bug Fixes

* removed sandbox mode ([f1dfa68](https://github.com/ecomclub/app-wirecard/commit/f1dfa681d229a98afabab25aadef1dc1c4671dfd))

### [2.2.4](https://github.com/ecomclub/app-wirecard/compare/v2.2.3...v2.2.4) (2021-09-27)

### [2.2.3](https://github.com/ecomclub/app-wirecard/compare/v2.2.2...v2.2.3) (2021-09-27)

### [2.2.2](https://github.com/ecomclub/app-wirecard/compare/v2.2.1...v2.2.2) (2021-09-27)

### [2.2.1](https://github.com/ecomclub/app-wirecard/compare/v2.2.0...v2.2.1) (2021-09-27)


### Bug Fixes

* fetch order from wirecard api instead using from dv ([26327ef](https://github.com/ecomclub/app-wirecard/commit/26327efff59c656932ea1317a927420537450c33))

## [2.2.0](https://github.com/ecomclub/app-wirecard/compare/v2.1.15...v2.2.0) (2021-09-26)


### Features

* **31:** periodically checking orders status with wirecard ([164147d](https://github.com/ecomclub/app-wirecard/commit/164147d6f218fa5960d6a91f742dab95dfcd33a5))


### Bug Fixes

* **create-transaction:** prevent errors with address chars lenght limits ([fdc51ae](https://github.com/ecomclub/app-wirecard/commit/fdc51aea04dc8903250c095528ee4647aa9ba8e6))
* **create-transation:** never returns 5xx status, better debug wirecard error responses ([730b6bd](https://github.com/ecomclub/app-wirecard/commit/730b6bd4667c453ae69462064c3393c5624e7559))

### [2.1.17](https://github.com/ecomplus/app-wirecard/compare/v2.1.16...v2.1.17) (2021-03-10)


### Bug Fixes

* **create-transaction:** prevent errors with address chars lenght limits ([fdc51ae](https://github.com/ecomplus/app-wirecard/commit/fdc51aea04dc8903250c095528ee4647aa9ba8e6))

### [2.1.16](https://github.com/ecomplus/app-wirecard/compare/v2.1.15...v2.1.16) (2021-02-08)


### Bug Fixes

* **create-transation:** never returns 5xx status, better debug wirecard error responses ([730b6bd](https://github.com/ecomplus/app-wirecard/commit/730b6bd4667c453ae69462064c3393c5624e7559))

### [2.1.15](https://github.com/ecomclub/app-wirecard/compare/v2.1.14...v2.1.15) (2021-01-12)


### Bug Fixes

* **application.json:** update admin_settings [#29](https://github.com/ecomclub/app-wirecard/issues/29) ([435323c](https://github.com/ecomclub/app-wirecard/commit/435323c896268cabb1dc1374e14fe009542f0fe0))
* application description ([0070988](https://github.com/ecomclub/app-wirecard/commit/0070988d079c9a3c558b69301889c69ad1608351))
* **list-payments.js:** sort payment methods ([82a4912](https://github.com/ecomclub/app-wirecard/commit/82a4912ac5be327e22c68fa2fc59d3bc1a28a596))
* **pkg:** install dotenv ([60df6b9](https://github.com/ecomclub/app-wirecard/commit/60df6b9d102bdf34cdcfbe5adfc0d442999f9bca))

### [2.1.14](https://github.com/ecomclub/app-wirecard/compare/v2.1.13...v2.1.14) (2020-11-11)

### [2.1.13](https://github.com/ecomclub/app-wirecard/compare/v2.1.12...v2.1.13) (2020-11-10)

### [2.1.11](https://github.com/ecomclub/app-wirecard/compare/v2.1.10...v2.1.11) (2020-10-23)

### [2.1.10](https://github.com/ecomclub/app-wirecard/compare/v2.1.9...v2.1.10) (2020-10-22)


### Bug Fixes

* **list-payments.js:** preventing error when amount is undefined ([17d861a](https://github.com/ecomclub/app-wirecard/commit/17d861a9ef49e2008cc38b174fab6e46af6b64b3))
* **webhook:** avoiding reversing the order of entries in payment_history ([82b03b3](https://github.com/ecomclub/app-wirecard/commit/82b03b3bea957f144f3b82fa220e1f1d3547b3f4))

### [2.1.9](https://github.com/ecomclub/app-wirecard/compare/v2.1.8...v2.1.9) (2020-08-28)


### Bug Fixes

* **list-payments.js:** min_installment ([e7e6f59](https://github.com/ecomclub/app-wirecard/commit/e7e6f597c6aa5cbab47c4895a83f0f6a3e171a98))

### [2.1.8](https://github.com/ecomclub/app-wirecard/compare/v2.1.7...v2.1.8) (2020-07-03)


### Bug Fixes

* **parse-payment-body:** preventing errors with products with quantity less than 0 ([5562c02](https://github.com/ecomclub/app-wirecard/commit/5562c029a733f0899d738ffb5ee311beff2689ad))

### [2.1.7](https://github.com/ecomclub/app-wirecard/compare/v2.1.6...v2.1.7) (2020-06-04)


### Bug Fixes

* **webhook:** fetch payment before patching the order ([cc393cb](https://github.com/ecomclub/app-wirecard/commit/cc393cbf8f386272142a114b4f504e47a6e4e310))

### [2.1.6](https://github.com/ecomclub/app-wirecard/compare/v2.1.5...v2.1.6) (2020-06-03)


### Bug Fixes

* **webhook:** returning 204 status at then ([b1793a5](https://github.com/ecomclub/app-wirecard/commit/b1793a5eb1fa2c89a87322531fe7820c487aa6df))

### [2.1.5](https://github.com/ecomclub/app-wirecard/compare/v2.1.4...v2.1.5) (2020-06-03)


### Bug Fixes

* **webhook:** using OR instead AND ([01844b9](https://github.com/ecomclub/app-wirecard/commit/01844b9f0bef8dc3037c2c53911219b71518da0c))

### [2.1.4](https://github.com/ecomclub/app-wirecard/compare/v2.1.3...v2.1.4) (2020-06-02)


### Bug Fixes

* **webhook:** change authorization status ([c00ff91](https://github.com/ecomclub/app-wirecard/commit/c00ff91fb01150ea6ab2991e033d2f9c608cecf4))

### [2.1.3](https://github.com/ecomclub/app-wirecard/compare/v2.1.2...v2.1.3) (2020-05-19)


### Bug Fixes

* **list-payments:** preventing errors with tax_value undefined ([56c77a8](https://github.com/ecomclub/app-wirecard/commit/56c77a8f516c805866161abb4fd8051889908848))

### [2.1.2](https://github.com/ecomclub/app-wirecard/compare/v2.1.1...v2.1.2) (2020-05-19)

### [2.1.1](https://github.com/ecomclub/app-wirecard/compare/v2.1.0...v2.1.1) (2020-05-11)


### Bug Fixes

* **webhook:** returning status 500 when no order is found ([477ecd7](https://github.com/ecomclub/app-wirecard/commit/477ecd7fdc59b1c3cd94e9cea2618e6e76bfe9b0))

## [2.1.0](https://github.com/ecomclub/app-wirecard/compare/v0.2.13...v2.1.0) (2020-04-24)


### Features

* **create-order:** create order in wirecard-api ([aa0831f](https://github.com/ecomclub/app-wirecard/commit/aa0831fa863f77387d8fd0b42401c9da875cd2e7))
* **database:** abstracting database ([b17e0b8](https://github.com/ecomclub/app-wirecard/commit/b17e0b867abe7eaab6bf15482678bdb9b6695ec0))
* **execute-payment:** execute order payment ([402d7f4](https://github.com/ecomclub/app-wirecard/commit/402d7f44b7e336146b12595d3a2eaeb5333d16d7))
* **get-public-key:** get public key from wirecard account ([d816d57](https://github.com/ecomclub/app-wirecard/commit/d816d57f60ced1752c2a800df73dffa1e98c8836))
* **list-payments:** installment payment using price table ([d9f9cbf](https://github.com/ecomclub/app-wirecard/commit/d9f9cbf169998e89af5aab1648478aaed2e6734a))
* **parse-payment-body:** parse list_payment body ([28d9f60](https://github.com/ecomclub/app-wirecard/commit/28d9f608820947b1f5ee63dad4ecf849dfd5b44d))
* **parse-payment-status:** turn parsePaymentStatus reusable ([46f5269](https://github.com/ecomclub/app-wirecard/commit/46f5269259e55533c730a7a6be846dc93fef1f11))
* **patch-application:** update application hidden_data ([6b4bd9f](https://github.com/ecomclub/app-wirecard/commit/6b4bd9f0a3743eeb1abec0a2fa75c9bc90c415c0))
* **register-webhook:** creates new webhook in wirecard-api ([f9d29ef](https://github.com/ecomclub/app-wirecard/commit/f9d29ef3a1580232e425f2f1fcce1abfa4fd6d26))
* **register-wirecard-webhook:** webhook task ([7f17f2e](https://github.com/ecomclub/app-wirecard/commit/7f17f2ef2aaa24965967374a1cca429cd2f1c46d))
* stop registering webhook for each store installed ([07324e1](https://github.com/ecomclub/app-wirecard/commit/07324e1756dcac29a049f009627d008c903df7ac))
* tabela price ([2552830](https://github.com/ecomclub/app-wirecard/commit/2552830308006c1bf2f2f94efc568da609f20e52))


### Bug Fixes

* **creat-transaction:** prevents undefined variable when has no property ([5897356](https://github.com/ecomclub/app-wirecard/commit/5897356258ad36cea2db236c26803301a63c8070))
* **creat-transaction:** prevents undefined variable when no property ([219c6c3](https://github.com/ecomclub/app-wirecard/commit/219c6c393a0ec3b1b112a16b585031d076b6e8ce))
* **create-transaction:** preventing errors with address without number ([62ff5e1](https://github.com/ecomclub/app-wirecard/commit/62ff5e1c2c168fd2d88a488e1373355e85ed2df1))
* get promise result correctly ([14d3d35](https://github.com/ecomclub/app-wirecard/commit/14d3d35c5128cd174a725d82578d3fdf7d911ce4))
* ignore erro if status code is greater than 500 ([58512a5](https://github.com/ecomclub/app-wirecard/commit/58512a547b628421d0ddb8cfd6b1a578f4c52b94))
* send discount in payment_gateways ([e9ff0e9](https://github.com/ecomclub/app-wirecard/commit/e9ff0e9774017b149e4658e08c23a1e674abb4be))
* **list-payments:** fix `installments_option` with tax ([4aee090](https://github.com/ecomclub/app-wirecard/commit/4aee090874fba7c774e538059672fd763c5519e5))
* **list-payments:** fix checking/seting `installments_option.max_number` ([9dc1d96](https://github.com/ecomclub/app-wirecard/commit/9dc1d96b3060582c5d749acf3d024d77f99e16e8))
* **list-payments:** response discount_option.label [#26](https://github.com/ecomclub/app-wirecard/issues/26) ([98023bc](https://github.com/ecomclub/app-wirecard/commit/98023bcc8b2d41b8a22b908e2a2ca5dc2c91ec1b))
* **list-payments:** typo fix, add instermediator to payment method name ([6723c3f](https://github.com/ecomclub/app-wirecard/commit/6723c3f778474dc6d10735ce8f3cb63ec33a0c3a))
* **map-items:** try final price, fallback to price ([fb6e3c9](https://github.com/ecomclub/app-wirecard/commit/fb6e3c9538589afd73ba4866d256adb05b61ddb7))
* **parse-payment-body:** additional fee for installments with fees ([5241ff7](https://github.com/ecomclub/app-wirecard/commit/5241ff777d7ed579d0e49271d6b4b3136553bcf2))
* **parse-payment-body:** preventing errors with installments ([32737aa](https://github.com/ecomclub/app-wirecard/commit/32737aad679b0a14b727ec4413064bc5b1d911bd))
